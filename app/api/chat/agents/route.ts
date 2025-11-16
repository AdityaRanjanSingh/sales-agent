import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { auth } from "@clerk/nextjs/server";
import { getGmailAccessTokenFunctionForUser } from "@/lib/gmail/credentials";
import { getDriveAccessTokenFunctionForUser } from "@/lib/drive/credentials";
import { createGmailTools } from "@/lib/gmail/tools";
import { createDriveTools } from "@/lib/drive/tools";
import { BrochureRetrieverTool } from "@/lib/tools/brochure";
import { getUserCustomInstructions } from "@/lib/preferences";

export const runtime = "nodejs";

// Persist LangGraph state between calls so the agent can maintain context
const agentCheckpointer = new MemorySaver();

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === "user") {
    return new HumanMessage(message.content);
  } else if (message.role === "assistant") {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

const convertLangChainMessageToVercelMessage = (message: BaseMessage) => {
  if (message._getType() === "human") {
    return { content: message.content, role: "user" };
  } else if (message._getType() === "ai") {
    return {
      content: message.content,
      role: "assistant",
      tool_calls: (message as AIMessage).tool_calls,
    };
  } else {
    return { content: message.content, role: message._getType() };
  }
};

const AGENT_SYSTEM_TEMPLATE = `You are a professional sales assistant AI that helps manage customer inquiries via email.

Your primary responsibilities:
1. Monitor incoming emails for requests related to brochures, catalogs, product information, or marketing materials
2. Analyze email content to understand what type of brochure or information the customer is requesting
3. Retrieve the appropriate brochure from storage using the retrieve_brochure tool
4. Draft a professional, friendly email response that addresses the customer's request
5. Include the brochure attachment in your response email

Guidelines:
- Be professional, courteous, and helpful in all communications
- Personalize responses based on the customer's specific request
- If the requested brochure is not available, politely inform the customer and offer alternatives
- Always verify you have the correct brochure before sending
- Include a professional email signature
- For brochure requests, use the workflow: search emails -> read email -> retrieve brochure -> create draft/send email

Available tools:
- gmail_search: Search for emails (e.g., unread emails mentioning "brochure")
- gmail_get_message: Get full content of a specific email
- gmail_get_thread: Get entire email thread for context
- retrieve_brochure: Fetch brochure files from storage
- drive_read_document: Read content from Google Drive documents (Docs/Sheets)
- gmail_create_draft: Create an email draft with attachments
- gmail_send_message: Send an email directly

When asked to "check for brochure requests" or similar, automatically:
1. Search for unread emails containing keywords like "brochure", "catalog", "information"
2. Read each email to understand the request
3. Retrieve the appropriate brochure
4. Draft/send a professional response with the brochure attached`;

/**
 * This handler initializes and calls a sales assistant ReAct agent with Gmail integration.
 * The agent monitors emails for brochure requests and drafts responses with attachments.
 *
 * See the docs for more information:
 * https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/
 */
export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customInstructions = await getUserCustomInstructions(userId);

    const body = await req.json();
    const returnIntermediateSteps = body.show_intermediate_steps;
    const firstMessageId: string | undefined = body?.messages?.[0]?.id;
    const threadId =
      body?.thread_id ||
      body?.threadId ||
      body?.id ||
      (firstMessageId ? `session-${firstMessageId}` : requestId);
    const runConfig = {
      configurable: {
        thread_id: threadId,
      },
    };

    /**
     * We represent intermediate steps as system messages for display purposes,
     * but don't want them in the chat history.
     */
    const messages = (body.messages ?? [])
      .filter(
        (message: VercelChatMessage) =>
          message.role === "user" || message.role === "assistant",
      )
      .map(convertVercelMessageToLangChainMessage);

    // Get Gmail access token function for the authenticated user
    // This function automatically handles token refresh
    let getGmailAccessToken: () => Promise<string>;
    try {
      getGmailAccessToken = await getGmailAccessTokenFunctionForUser(userId);
    } catch (error) {
      console.error(
        `[Agent Route ${requestId}] Failed to create Gmail access token function:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return NextResponse.json(
        {
          error:
            "Gmail not connected. Please connect your Gmail account to use the sales assistant.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 401 },
      );
    }

    // Get Drive access token function for the authenticated user
    let getDriveAccessToken: () => Promise<string>;
    try {
      getDriveAccessToken = await getDriveAccessTokenFunctionForUser(userId);
    } catch (error) {
      console.error(
        `[Agent Route ${requestId}] Failed to create Drive access token function:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      // Note: Drive is optional, so we don't return an error
      // Create a dummy function that will throw if called
      getDriveAccessToken = async () => {
        throw new Error(
          "Google Drive not connected. Please connect your Google account to use Drive features.",
        );
      };
    }

    // Initialize Gmail tools with user's OAuth credentials using the factory function
    // The accessToken function allows automatic token refresh when needed
    let gmailTools;
    try {
      gmailTools = createGmailTools(getGmailAccessToken);
    } catch (error) {
      console.error(
        `[Agent Route ${requestId}] Failed to create Gmail tools:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw new Error(
        `Failed to initialize Gmail tools: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Initialize Drive tools with user's OAuth credentials
    let driveTools;
    try {
      driveTools = createDriveTools(getDriveAccessToken);
    } catch (error) {
      console.error(
        `[Agent Route ${requestId}] Failed to create Drive tools:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw new Error(
        `Failed to initialize Drive tools: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const tools = [
      gmailTools.search,
      gmailTools.getMessage,
      gmailTools.getThread,
      gmailTools.createDraft,
      gmailTools.sendMessage,
      driveTools.readDocument,
      new BrochureRetrieverTool(),
    ];

    const chat = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    /**
     * Use a prebuilt LangGraph ReAct agent with Gmail tools.
     */
    const agentSystemPrompt = customInstructions
      ? `${AGENT_SYSTEM_TEMPLATE}\n\nUSER CUSTOM INSTRUCTIONS:\n${customInstructions}`
      : AGENT_SYSTEM_TEMPLATE;

    const agent = createReactAgent({
      llm: chat,
      tools,
      /**
       * Modify the stock prompt to be a sales assistant
       */
      messageModifier: new SystemMessage(agentSystemPrompt),
      checkpointer: agentCheckpointer,
    });

    if (!returnIntermediateSteps) {
      /**
       * Stream back all generated tokens and steps from their runs.
       *
       * We do some filtering of the generated events and only stream back
       * the final response as a string.
       *
       * For this specific type of tool calling ReAct agents with OpenAI, we can tell when
       * the agent is ready to stream back final output when it no longer calls
       * a tool and instead streams back content.
       *
       * See: https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/
       */
      const eventStream = agent.streamEvents(
        { messages },
        { ...runConfig, version: "v2" },
      );

      const textEncoder = new TextEncoder();
      const transformStream = new ReadableStream({
        async start(controller) {
          for await (const { event, data } of eventStream) {
            if (event === "on_chat_model_stream") {
              // Intermediate chat model generations will contain tool calls and no content
              if (!!data.chunk.content) {
                controller.enqueue(textEncoder.encode(data.chunk.content));
              }
            }
          }
          controller.close();
        },
      });

      return new StreamingTextResponse(transformStream);
    } else {
      /**
       * We could also pick intermediate steps out from `streamEvents` chunks, but
       * they are generated as JSON objects, so streaming and displaying them with
       * the AI SDK is more complicated.
       */
      const result = await agent.invoke({ messages }, runConfig);

      return NextResponse.json(
        {
          messages: result.messages.map(convertLangChainMessageToVercelMessage),
        },
        { status: 200 },
      );
    }
  } catch (e: any) {
    console.error("[Agent Route] Fatal error:", {
      error: e.message,
      status: e.status ?? 500,
      stack: e.stack,
    });

    // Provide more detailed error messages to users
    let userMessage = e.message;
    let errorDetails = "";

    if (e.message?.includes("Gmail")) {
      userMessage =
        "Gmail tool execution failed. Please check your Gmail connection and try again.";
      errorDetails = e.message;
    } else if (e.message?.includes("OAuth") || e.message?.includes("token")) {
      userMessage =
        "Authentication error. Please reconnect your Google account.";
      errorDetails = e.message;
    } else if (e.message?.includes("Tool")) {
      userMessage =
        "A tool execution error occurred. The sales assistant encountered a problem while performing an action.";
      errorDetails = e.message;
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: errorDetails || e.message,
      },
      {
        status: e.status ?? 500,
      },
    );
  }
}
