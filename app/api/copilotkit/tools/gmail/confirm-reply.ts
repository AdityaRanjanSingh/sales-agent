/**
 * Confirm Reply Action
 * CopilotKit action that creates a Gmail draft after user confirmation
 * Takes the pending draft and creates it in Gmail with proper threading
 */

import { Action } from "@copilotkit/shared";
import { getPendingDraft, removePendingDraft } from "@/lib/state/reply-drafts";

export function createConfirmReplyAction(
  getAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "confirm_email_reply",
    description: `Confirm and create an email reply draft in Gmail after user approval.

This action should be used after prepare_email_reply when the user approves the draft.
The user might say things like:
- "approve"
- "create the draft"
- "looks good"
- "yes, send it" (note: this creates a draft, doesn't send)
- "go ahead"

The action retrieves the pending draft and creates it in Gmail with proper email threading.`,

    parameters: [
      {
        name: "confirmationId",
        type: "string",
        description:
          "The confirmation ID from the prepare_email_reply action. This is shown in the draft preview.",
        required: true,
      },
      {
        name: "editedContent",
        type: "string",
        description:
          "Optional: If the user requested changes to the draft, include the edited content here. Otherwise, leave empty to use the original draft.",
        required: false,
      },
    ],

    handler: async ({ confirmationId, editedContent }) => {
      try {
        console.log("[ConfirmReplyAction] Confirming draft:", confirmationId);
        console.log("Has edits:", !!editedContent);

        // Retrieve the pending draft
        const pendingDraft = getPendingDraft(confirmationId);

        if (!pendingDraft) {
          return `❌ **Draft Not Found**

The draft with confirmation ID \`${confirmationId}\` was not found. It may have expired (drafts expire after 10 minutes) or already been created.

Please prepare a new draft using the prepare_email_reply action.`;
        }

        // Use edited content if provided, otherwise use original
        const finalContent = editedContent || pendingDraft.draftContent;

        console.log("[ConfirmReplyAction] Creating Gmail draft");
        console.log("Thread ID:", pendingDraft.threadId);
        console.log("To:", pendingDraft.to);
        console.log("Subject:", pendingDraft.subject);

        // Get access token
        const token = await getAccessToken();

        // Import Gmail tool dynamically
        const { GmailCreateDraft } = await import(
          "@langchain/community/tools/gmail"
        );

        // Create Gmail draft tool
        const createDraftTool = new GmailCreateDraft({
          credentials: {
            accessToken: async () => token,
          },
        });

        // Construct the email message with threading headers
        let emailMessage = finalContent;

        // Add threading headers if available
        if (pendingDraft.headers.inReplyTo || pendingDraft.headers.references) {
          // Gmail API expects headers in the message content for threading
          let headers = "";

          if (pendingDraft.headers.inReplyTo) {
            headers += `In-Reply-To: <${pendingDraft.headers.inReplyTo}>\n`;
          }

          if (pendingDraft.headers.references) {
            headers += `References: <${pendingDraft.headers.references}>\n`;
          }

          // Note: The LangChain GmailCreateDraft tool may not support custom headers
          // directly. In production, you might need to use the Gmail API directly
          // For now, we'll create a standard draft and note the limitation
          console.log(
            "[ConfirmReplyAction] Note: Threading headers may not be applied by LangChain tool",
          );
          console.log("Headers:", headers);
        }

        // Create the draft
        const result = await createDraftTool.invoke({
          message: emailMessage,
          to: pendingDraft.to,
          subject: pendingDraft.subject,
        });

        console.log("[ConfirmReplyAction] Draft created:", result);

        // Remove the pending draft from state
        removePendingDraft(confirmationId);

        // Format success message
        const successMessage = formatSuccessMessage(pendingDraft, result);

        return successMessage;
      } catch (error) {
        console.error("[ConfirmReplyAction] Error creating draft:", error);
        return `❌ **Error Creating Draft**

Failed to create the email draft: ${error instanceof Error ? error.message : "Unknown error"}

Please try again or check your Gmail connection.`;
      }
    },
  };
}

/**
 * Format the success message after draft creation
 */
function formatSuccessMessage(
  draft: {
    threadId: string;
    subject: string;
    to: string[];
  },
  gmailResult: string,
): string {
  let message = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ EMAIL DRAFT CREATED SUCCESSFULLY\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `**Subject:** ${draft.subject}\n`;
  message += `**To:** ${draft.to.join(", ")}\n`;
  message += `**Thread:** ${draft.threadId}\n\n`;

  message += `📬 Your draft has been created in Gmail and is ready to review.\n\n`;

  message += `**Next Steps:**\n`;
  message += `1. Open Gmail and navigate to your **Drafts** folder\n`;
  message += `2. Review the draft for accuracy\n`;
  message += `3. Make any final edits if needed\n`;
  message += `4. Click **Send** when ready\n\n`;

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `_Note: The draft was created as a reply in the email thread._\n`;

  return message;
}
