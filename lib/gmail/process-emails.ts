import { google } from "googleapis";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createGmailTools } from "./tools";

const AGENT_SYSTEM_TEMPLATE = `You are a professional sales assistant AI that helps manage customer inquiries and communications via email.

Your primary responsibilities:
1. Monitor and manage incoming customer emails
2. Analyze email content to understand customer needs and requests
3. Query company knowledge base for relevant information (pricing, policies, product details)
4. Draft professional, personalized email responses that address customer inquiries
5. Help manage email workflows with full context awareness

Guidelines:
- Be professional, courteous, and helpful in all communications
- Personalize responses based on the customer's specific request and history
- Use the company knowledge base to provide accurate information
- Always verify information before including it in responses
- Include a professional email signature

Available tools:
- gmail_search: Search for emails (e.g., unread emails from a specific sender)
- gmail_get_message: Get full content of a specific email
- gmail_get_thread: Get entire email thread for context
- gmail_create_draft: Create an email draft with attachments
- gmail_send_message: Send an email directly

When processing new emails, automatically:
1. Search for unread emails that require responses
2. Read each email to understand the inquiry
3. Gather necessary context from the knowledge base
4. Draft professional responses that address the customer's needs`;

interface ProcessEmailsParams {
  emailAddress: string;
  historyId: number;
  userId: string;
}

interface ProcessEmailsResult {
  success: boolean;
  message: string;
  emailsProcessed?: number;
  error?: string;
}

/**
 * Process new emails from Gmail using the history ID
 * This function is called by the webhook when new email notifications arrive
 */
export async function processNewEmails(
  params: ProcessEmailsParams,
  getAccessToken: () => Promise<string>
): Promise<ProcessEmailsResult> {
  const { emailAddress, historyId, userId } = params;

  try {
    console.log(`[Process Emails] Starting email processing for ${emailAddress}`, {
      historyId,
      userId,
    });

    // Initialize Gmail API client
    const accessToken = await getAccessToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Get the current history to check for new messages
    // Note: You might want to store the last processed historyId in a database
    // For now, we'll just search for recent unread emails
    const gmailTools = createGmailTools(getAccessToken);

    // Initialize the sales assistant agent
    const tools = [
      gmailTools.search,
      gmailTools.getMessage,
      gmailTools.getThread,
      gmailTools.createDraft,
      gmailTools.sendMessage,
    ];

    const chat = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    const agent = createReactAgent({
      llm: chat,
      tools,
      messageModifier: new SystemMessage(AGENT_SYSTEM_TEMPLATE),
    });

    // Invoke the agent to check for customer inquiries
    const result = await agent.invoke({
      messages: [
        new HumanMessage(
          `New email notification received. Please check for any unread emails that require responses. For each customer inquiry you find, analyze the request, gather necessary context from the knowledge base, and draft a professional response email.`
        ),
      ],
    });

    console.log(`[Process Emails] Agent completed processing for ${emailAddress}`, {
      messagesCount: result.messages.length,
    });

    return {
      success: true,
      message: "Emails processed successfully",
      emailsProcessed: 1, // Update this based on actual count if needed
    };
  } catch (error) {
    console.error(`[Process Emails] Error processing emails for ${emailAddress}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      historyId,
    });

    return {
      success: false,
      message: "Failed to process emails",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get user ID from email address using Clerk
 * This helps map Gmail notifications to the correct user account
 */
export async function getUserIdFromEmail(
  emailAddress: string
): Promise<string | null> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    // Search for users with this email address
    const users = await client.users.getUserList({
      emailAddress: [emailAddress],
    });

    if (users.data.length === 0) {
      console.warn(`[Get User] No user found for email: ${emailAddress}`);
      return null;
    }

    // Return the first matching user's ID
    const userId = users.data[0].id;
    console.log(`[Get User] Found user ID ${userId} for email ${emailAddress}`);
    return userId;
  } catch (error) {
    console.error(`[Get User] Error finding user for email ${emailAddress}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
