import { google } from "googleapis";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createGmailTools } from "./tools";
import { BrochureRetrieverTool } from "../tools/brochure";

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

When processing new emails, automatically:
1. Search for unread emails containing keywords like "brochure", "catalog", "information"
2. Read each email to understand the request
3. Retrieve the appropriate brochure
4. Draft/send a professional response with the brochure attached`;

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
      new BrochureRetrieverTool(),
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

    // Invoke the agent to check for brochure requests
    const result = await agent.invoke({
      messages: [
        new HumanMessage(
          `New email notification received. Please check for any unread emails that contain requests for brochures, catalogs, or product information. For each brochure request you find, retrieve the appropriate brochure and draft a professional response email with the brochure attached.`
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
