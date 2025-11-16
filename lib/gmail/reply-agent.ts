/**
 * Email Reply Agent
 * LangGraph agent for drafting email replies with full context awareness
 * Gathers thread context, customer history, and company knowledge to generate informed replies
 */

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { createGmailTools } from "./tools";
import { createCustomerHistoryTool } from "../tools/customer-history";
import { createKnowledgeBaseTool } from "../tools/knowledge-base";

/**
 * System prompt for the reply agent
 */
const REPLY_AGENT_SYSTEM_PROMPT = `You are an expert email reply assistant that helps draft professional, contextually-aware email responses.

Your primary responsibilities:
1. Gather complete context before drafting a reply
2. Read the entire email thread to understand the conversation
3. Search for previous interactions with the customer for relationship context
4. Retrieve relevant company knowledge (policies, pricing, products) when needed
5. Incorporate user-provided talking points or instructions
6. Draft professional, personalized, and helpful email replies

WORKFLOW - Follow these steps in order:

1. UNDERSTAND THE REQUEST
   - Identify which email/thread to reply to
   - Note any specific instructions or talking points from the user

2. GATHER CONTEXT (Use all relevant tools)
   - Use gmail_get_thread to read the entire conversation
   - Use search_customer_history to find past interactions with this customer
   - Use retrieve_company_knowledge if customer questions require company info (pricing, policies, etc.)
   - Use gmail_search if you need to find the thread first

3. DRAFT THE REPLY
   - Address all points raised in the email thread
   - Incorporate user's talking points naturally
   - Use information from company knowledge base when relevant
   - Personalize based on customer history
   - Maintain professional yet friendly tone
   - Include proper email structure (greeting, body, closing, signature)

4. FORMAT THE PREVIEW
   - Present a clear preview of the draft
   - Show thread subject and recipients
   - Display the full draft message
   - Ask for user confirmation or edits

IMPORTANT GUIDELINES:
- Always gather context before drafting (don't skip tools)
- Be thorough but concise - customers value their time
- Match the tone of the conversation (formal vs. casual)
- If customer asked questions, answer them directly
- If referencing policies/pricing, use exact info from knowledge base
- Personalize greetings using customer's name when known
- End with appropriate call-to-action
- Include professional signature

AVAILABLE TOOLS:
- gmail_search: Find emails by query
- gmail_get_message: Get single email details
- gmail_get_thread: Get full conversation thread (IMPORTANT: Use this for context)
- search_customer_history: Find past emails with this customer
- retrieve_company_knowledge: Get company FAQs, policies, pricing, etc.

DO NOT create the draft directly - only prepare the draft content and return it.
The draft will be created after user confirmation.

Remember: Quality over speed. Take time to gather context and craft a thoughtful reply.`;

/**
 * Interface for reply agent input
 */
export interface ReplyAgentInput {
  userInstructions: string; // User's request (e.g., "Reply to john@acme.com about pricing")
  threadId?: string; // Optional: specific thread ID if known
  userTalkingPoints?: string; // Optional: specific points user wants to mention
}

/**
 * Interface for reply agent output
 */
export interface ReplyAgentOutput {
  draftContent: string; // The drafted email body
  threadId: string; // The thread being replied to
  threadSubject: string; // Subject of the thread
  to: string[]; // Recipients
  threadContext: string; // Summary of the thread for preview
  inReplyTo?: string; // Message ID being replied to
  references?: string; // Reference headers for threading
}

/**
 * Create a reply agent with all necessary tools
 */
export function createReplyAgent(getAccessToken: () => Promise<string>) {
  // Create all tools
  const gmailTools = createGmailTools(getAccessToken);
  const customerHistoryTool = createCustomerHistoryTool(getAccessToken);
  const knowledgeBaseTool = createKnowledgeBaseTool();

  // Combine tools for the agent
  const tools = [
    gmailTools.search,
    gmailTools.getMessage,
    gmailTools.getThread,
    customerHistoryTool,
    knowledgeBaseTool,
  ];

  // Create the agent
  const agent = createReactAgent({
    llm: new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7, // Slightly higher for more natural language
    }),
    tools,
    messageModifier: new SystemMessage(REPLY_AGENT_SYSTEM_PROMPT),
  });

  return agent;
}

/**
 * Run the reply agent and extract the draft reply
 */
export async function generateReplyDraft(
  getAccessToken: () => Promise<string>,
  input: ReplyAgentInput
): Promise<ReplyAgentOutput> {
  const agent = createReplyAgent(getAccessToken);

  // Construct the task for the agent
  let task = input.userInstructions;

  if (input.userTalkingPoints) {
    task += `\n\nSpecific points to include:\n${input.userTalkingPoints}`;
  }

  if (input.threadId) {
    task += `\n\nThread ID: ${input.threadId}`;
  }

  console.log("[ReplyAgent] Running agent with task:", task);

  // Invoke the agent
  const result = await agent.invoke({
    messages: [{ role: "user", content: task }],
  });

  console.log("[ReplyAgent] Agent completed. Messages:", result.messages.length);

  // Extract the final response from the agent
  const finalMessage =
    result.messages[result.messages.length - 1]?.content || "";

  console.log("[ReplyAgent] Final message:", finalMessage);

  // Parse the agent's response to extract structured data
  // The agent should have used tools to gather context and prepared a draft
  // We need to extract: draft content, thread info, recipients, etc.

  // For now, we'll parse the final message and tool calls to extract needed data
  // In a production system, you might want to use structured output or function calling

  const output = await parseAgentOutput(result, getAccessToken);

  return output;
}

/**
 * Parse agent output to extract structured reply data
 * This examines the agent's tool calls and final message to construct the reply
 */
async function parseAgentOutput(
  agentResult: any,
  getAccessToken: () => Promise<string>
): Promise<ReplyAgentOutput> {
  // Extract tool calls from messages
  const messages = agentResult.messages || [];

  let threadId = "";
  let threadSubject = "";
  let to: string[] = [];
  let threadContext = "";
  let inReplyTo = "";
  let references = "";
  let draftContent = "";

  // Find the getThread tool call to extract thread metadata
  for (const message of messages) {
    if (message.additional_kwargs?.tool_calls) {
      const toolCalls = message.additional_kwargs.tool_calls;

      for (const toolCall of toolCalls) {
        if (toolCall.function?.name === "gmail_get_thread") {
          // Extract threadId from the tool call
          const args = JSON.parse(toolCall.function.arguments || "{}");
          threadId = args.threadId || threadId;
        }
      }
    }

    // Check for tool messages (responses from tools)
    if (message.type === "tool" && message.name === "gmail_get_thread") {
      threadContext = message.content || "";

      // Parse thread context to extract metadata
      // GmailGetThread returns formatted text with thread info
      const subjectMatch = threadContext.match(/Subject: (.+)/);
      if (subjectMatch) {
        threadSubject = subjectMatch[1];
      }

      const fromMatch = threadContext.match(/From: (.+)/);
      if (fromMatch) {
        // Extract email from "Name <email@domain.com>" format
        const emailMatch = fromMatch[1].match(/<(.+?)>/) || fromMatch[1].match(/(\S+@\S+)/);
        if (emailMatch) {
          to = [emailMatch[1]];
        }
      }

      // Extract Message-ID for In-Reply-To header
      const messageIdMatch = threadContext.match(/Message-ID: <(.+?)>/i);
      if (messageIdMatch) {
        inReplyTo = messageIdMatch[1];
        references = messageIdMatch[1]; // For now, use same as inReplyTo
      }
    }
  }

  // Extract draft content from the final AI message
  const finalMessage = messages[messages.length - 1];
  if (finalMessage && finalMessage.content) {
    draftContent = finalMessage.content;

    // Clean up the draft content if it includes agent's explanations
    // Try to extract just the email body if the agent formatted it clearly
    const emailBodyMatch = draftContent.match(/```\s*email\s*([\s\S]+?)```/i) ||
                           draftContent.match(/━━━.*?DRAFT.*?━━━\s*([\s\S]+?)(?:━━━|$)/i);

    if (emailBodyMatch) {
      draftContent = emailBodyMatch[1].trim();
    }
  }

  // If we don't have a subject, create one (Re: Original Subject)
  if (threadSubject && !threadSubject.startsWith("Re:")) {
    threadSubject = `Re: ${threadSubject}`;
  }

  return {
    draftContent,
    threadId,
    threadSubject,
    to,
    threadContext: threadContext.substring(0, 500) + "...", // Truncate for preview
    inReplyTo,
    references,
  };
}
