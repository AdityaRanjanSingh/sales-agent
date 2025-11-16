/**
 * Prepare Reply Action
 * CopilotKit action that generates an email reply draft with full context
 * Shows preview to user and waits for confirmation
 */

import { Action } from "@copilotkit/shared";
import { generateReplyDraft } from "@/lib/gmail/reply-agent";
import { storePendingDraft } from "@/lib/state/reply-drafts";

interface PrepareReplyOptions {
  customInstructions?: string;
}

export function createPrepareReplyAction(
  getAccessToken: () => Promise<string>,
  options?: PrepareReplyOptions
): Action<any> {
  return {
    name: "prepare_email_reply",
    description: `Prepare a draft reply to an email or email thread. This action will:
1. Gather full context by reading the email thread
2. Search for previous interactions with the customer
3. Retrieve relevant company knowledge (pricing, policies, etc.) if needed
4. Generate a professional draft reply based on the context and your instructions
5. Show you a preview for confirmation before creating the draft

Use this when the user wants to reply to an email. The user will provide:
- Instructions on which email to reply to (e.g., "reply to john@acme.com about pricing")
- Optional talking points or specific things to mention in the reply

This action does NOT create the draft immediately - it shows a preview first.`,

    parameters: [
      {
        name: "userInstructions",
        type: "string",
        description:
          "User's instructions for the reply (e.g., 'Reply to the email from john@acme.com about pricing'). This should identify which email to reply to.",
        required: true,
      },
      {
        name: "threadId",
        type: "string",
        description:
          "Optional: The Gmail thread ID if known. If not provided, the agent will search for the thread based on userInstructions.",
        required: false,
      },
      {
        name: "userTalkingPoints",
        type: "string",
        description:
          "Optional: Specific points the user wants to mention in the reply (e.g., 'mention our new 20% discount promotion')",
        required: false,
      },
    ],

    handler: async ({ userInstructions, threadId, userTalkingPoints }) => {
      try {
        console.log("[PrepareReplyAction] Starting reply preparation");
        console.log("User instructions:", userInstructions);
        console.log("Thread ID:", threadId);
        console.log("Talking points:", userTalkingPoints);

        // Get access token
        const token = await getAccessToken();

        // Run the reply agent to generate the draft
        const replyData = await generateReplyDraft(getAccessToken, {
          userInstructions,
          threadId,
          userTalkingPoints,
          customInstructions: options?.customInstructions,
        });

        console.log("[PrepareReplyAction] Draft generated");
        console.log("Thread ID:", replyData.threadId);
        console.log("Subject:", replyData.threadSubject);
        console.log("To:", replyData.to);

        // Store the pending draft
        const confirmationId = storePendingDraft({
          threadId: replyData.threadId,
          to: replyData.to,
          subject: replyData.threadSubject,
          draftContent: replyData.draftContent,
          threadContext: replyData.threadContext,
          headers: {
            inReplyTo: replyData.inReplyTo,
            references: replyData.references,
          },
        });

        console.log("[PrepareReplyAction] Draft stored with ID:", confirmationId);

        // Format the preview for the user
        const preview = formatDraftPreview(replyData, confirmationId);

        return preview;
      } catch (error) {
        console.error("[PrepareReplyAction] Error preparing reply:", error);
        return `Error preparing reply: ${error instanceof Error ? error.message : "Unknown error"}

Please try again or provide more specific information about which email to reply to.`;
      }
    },
  };
}

/**
 * Format the draft preview for user confirmation
 */
function formatDraftPreview(
  replyData: {
    threadId: string;
    threadSubject: string;
    to: string[];
    draftContent: string;
    threadContext: string;
  },
  confirmationId: string
): string {
  let preview = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  preview += `📧 EMAIL REPLY DRAFT PREVIEW\n`;
  preview += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Thread information
  preview += `**Thread:** ${replyData.threadSubject}\n`;
  preview += `**To:** ${replyData.to.join(", ")}\n`;
  preview += `**Thread ID:** ${replyData.threadId}\n\n`;

  // Thread context summary
  if (replyData.threadContext) {
    preview += `**Context:**\n${replyData.threadContext}\n\n`;
  }

  preview += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  preview += `**DRAFT MESSAGE:**\n\n`;
  preview += `${replyData.draftContent}\n`;
  preview += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Instructions for next steps
  preview += `**What would you like to do?**\n\n`;
  preview += `✅ To create this draft in Gmail, say: **"approve"** or **"create the draft"**\n`;
  preview += `✏️ To make changes, provide your edits (e.g., "make it more casual" or "add information about X")\n`;
  preview += `❌ To cancel, say: **"cancel"** or **"nevermind"**\n\n`;

  preview += `_Confirmation ID: \`${confirmationId}\`_\n`;
  preview += `_This draft preview will expire in 10 minutes._\n`;

  return preview;
}
