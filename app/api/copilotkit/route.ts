import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { getGmailAccessTokenFunction } from "@/lib/gmail/credentials";
import { Action } from "@copilotkit/shared";

export const runtime = "nodejs";

const SALES_ASSISTANT_INSTRUCTIONS = `You are a professional sales assistant AI that helps manage customer inquiries via email.

Your primary responsibilities:
1. Monitor incoming emails for requests related to brochures, catalogs, product information, or marketing materials
2. Analyze email content to understand what type of brochure or information the customer is requesting
3. Retrieve the appropriate brochure from storage using the retrieve_brochure action
4. Draft a professional, friendly email response that addresses the customer's request
5. Include the brochure attachment in your response email

Guidelines:
- Be professional, courteous, and helpful in all communications
- Personalize responses based on the customer's specific request
- If the requested brochure is not available, politely inform the customer and offer alternatives
- Always verify you have the correct brochure before sending
- Include a professional email signature
- For brochure requests, use the workflow: search emails -> read email -> retrieve brochure -> create draft/send email

Available actions:
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
 * CopilotKit runtime endpoint that handles all copilot interactions
 * Integrates Gmail tools and brochure retriever with user's OAuth credentials
 */
export async function POST(req: NextRequest) {
  try {
    // Get Gmail access token function for the authenticated user
    let getAccessToken: () => Promise<string>;
    try {
      getAccessToken = await getGmailAccessTokenFunction();
    } catch (error) {
      console.error('[CopilotKit] Failed to get Gmail access token:', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return error response
      return new Response(
        JSON.stringify({
          error: "Gmail not connected. Please connect your Gmail account to use the sales assistant.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Define CopilotKit actions for Gmail and brochure operations
    const actions: Action<any>[] = [
      {
        name: "gmail_search",
        description: "Search for emails in Gmail. Returns matching email IDs and metadata. Use query parameter to filter (e.g., 'is:unread brochure' for unread emails about brochures).",
        parameters: [
          {
            name: "query",
            type: "string",
            description: "Gmail search query string (e.g., 'is:unread', 'from:user@example.com', 'subject:brochure')",
            required: true,
          },
        ],
        handler: async ({ query }) => {
          const { GmailSearch } = await import("@langchain/community/tools/gmail");
          const token = await getAccessToken();
          const searchTool = new GmailSearch({
            credentials: { accessToken: async () => token }
          });
          const result = await searchTool.invoke({ query });
          return result;
        },
      },
      {
        name: "gmail_get_message",
        description: "Get the full content of a specific email by ID. Returns the email body, subject, sender, and other metadata.",
        parameters: [
          {
            name: "messageId",
            type: "string",
            description: "The Gmail message ID to retrieve",
            required: true,
          },
        ],
        handler: async ({ messageId }) => {
          const { GmailGetMessage } = await import("@langchain/community/tools/gmail");
          const token = await getAccessToken();
          const getTool = new GmailGetMessage({
            credentials: { accessToken: async () => token }
          });
          const result = await getTool.invoke({ messageId });
          return result;
        },
      },
      {
        name: "gmail_get_thread",
        description: "Get an entire email thread/conversation by ID. Useful for understanding the full context of an email exchange.",
        parameters: [
          {
            name: "threadId",
            type: "string",
            description: "The Gmail thread ID to retrieve",
            required: true,
          },
        ],
        handler: async ({ threadId }) => {
          const { GmailGetThread } = await import("@langchain/community/tools/gmail");
          const token = await getAccessToken();
          const threadTool = new GmailGetThread({
            credentials: { accessToken: async () => token }
          });
          const result = await threadTool.invoke({ threadId });
          return result;
        },
      },
      {
        name: "gmail_create_draft",
        description: "Create an email draft in Gmail. The draft can be reviewed and sent manually later. Use this when you want human approval before sending.",
        parameters: [
          {
            name: "message",
            type: "string",
            description: "JSON string containing email fields: to, subject, body, cc (optional), bcc (optional)",
            required: true,
          },
        ],
        handler: async ({ message }) => {
          const { GmailCreateDraft } = await import("@langchain/community/tools/gmail");
          const token = await getAccessToken();
          const draftTool = new GmailCreateDraft({
            credentials: { accessToken: async () => token }
          });
          const result = await draftTool.invoke({ message });
          return result;
        },
      },
      {
        name: "gmail_send_message",
        description: "Send an email directly via Gmail. Use with caution - the email will be sent immediately without human review.",
        parameters: [
          {
            name: "message",
            type: "string",
            description: "JSON string containing email fields: to, subject, body, cc (optional), bcc (optional)",
            required: true,
          },
        ],
        handler: async ({ message }) => {
          const { GmailSendMessage } = await import("@langchain/community/tools/gmail");
          const token = await getAccessToken();
          const sendTool = new GmailSendMessage({
            credentials: { accessToken: async () => token }
          });
          const result = await sendTool.invoke({ message });
          return result;
        },
      },
      {
        name: "retrieve_brochure",
        description: "Retrieves a brochure file from storage. Use this when a customer requests marketing materials, product information, catalogs, or brochures. Returns the file's public URL and metadata.",
        parameters: [
          {
            name: "brochureName",
            type: "string",
            description: "The name or type of brochure to retrieve (e.g., 'product-catalog', 'pricing-sheet', 'company-overview')",
            required: true,
          },
        ],
        handler: async ({ brochureName }) => {
          const { createClient } = await import("@supabase/supabase-js");

          try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_PRIVATE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              return JSON.stringify({
                success: false,
                error: "Supabase credentials not configured",
              });
            }

            const supabase = createClient(supabaseUrl, supabaseKey);

            // List files in the brochures bucket to find matching brochure
            const { data: files, error: listError } = await supabase
              .storage
              .from("brochures")
              .list("", {
                limit: 100,
                offset: 0,
              });

            if (listError) {
              return JSON.stringify({
                success: false,
                error: `Failed to list brochures: ${listError.message}`,
              });
            }

            if (!files || files.length === 0) {
              return JSON.stringify({
                success: false,
                error: "No brochures found in storage",
                availableBrochures: [],
              });
            }

            // Find matching brochure (case-insensitive partial match)
            const matchingFile = files.find((file) =>
              file.name.toLowerCase().includes(brochureName.toLowerCase()) ||
              brochureName.toLowerCase().includes(file.name.toLowerCase().replace(/\.[^/.]+$/, ""))
            );

            if (!matchingFile) {
              const availableNames = files.map((f) => f.name).join(", ");
              return JSON.stringify({
                success: false,
                error: `Brochure '${brochureName}' not found`,
                availableBrochures: files.map((f) => f.name),
                suggestion: `Available brochures: ${availableNames}`,
              });
            }

            // Get public URL for the brochure
            const { data: urlData } = supabase
              .storage
              .from("brochures")
              .getPublicUrl(matchingFile.name);

            return JSON.stringify({
              success: true,
              brochure: {
                name: matchingFile.name,
                publicUrl: urlData.publicUrl,
                size: matchingFile.metadata?.size,
                lastModified: matchingFile.updated_at,
                mimeType: matchingFile.metadata?.mimetype,
              },
              message: `Successfully retrieved brochure: ${matchingFile.name}. You can use the publicUrl to attach this file to an email.`,
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: `Error retrieving brochure: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        },
      },
    ];

    // Create CopilotKit runtime with OpenAI adapter
    const copilotKit = new CopilotRuntime({
      actions,
    });

    const serviceAdapter = new OpenAIAdapter({
      model: "gpt-4o-mini",
    });

    const handler = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: copilotKit,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handler.POST(req);
  } catch (error) {
    console.error('[CopilotKit] Fatal error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
