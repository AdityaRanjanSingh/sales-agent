import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { getGmailAccessTokenFunction } from "@/lib/gmail/credentials";
import { createGmailTools } from "@/lib/gmail/tools";
import { BrochureRetrieverTool } from "@/lib/tools/brochure";

export const runtime = "nodejs";

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
  try {
    const body = await req.json();
    const returnIntermediateSteps = body.show_intermediate_steps;

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
    let getAccessToken;
    try {
      getAccessToken = await getGmailAccessTokenFunction();
    } catch (error) {
      return NextResponse.json(
        {
          error: "Gmail not connected. Please connect your Gmail account to use the sales assistant.",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 401 }
      );
    }

    // Initialize Gmail tools with user's OAuth credentials using the factory function
    // The accessToken function allows automatic token refresh when needed
    const gmailTools = createGmailTools(getAccessToken);
    const tools = [
      gmailTools.search,
      gmailTools.getMessage,
      gmailTools.getThread,
      gmailTools.createDraft,
      gmailTools.sendMessage,
      new BrochureRetrieverTool(),
    ];

    const chat = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    /**
     * Use a prebuilt LangGraph ReAct agent with Gmail tools.
     */
    const agent = createReactAgent({
      llm: chat,
      tools,
      /**
       * Modify the stock prompt to be a sales assistant
       */
      messageModifier: new SystemMessage(AGENT_SYSTEM_TEMPLATE),
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
        { version: "v2" },
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
      const result = await agent.invoke({ messages });

      return NextResponse.json(
        {
          messages: result.messages.map(convertLangChainMessageToVercelMessage),
        },
        { status: 200 },
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
