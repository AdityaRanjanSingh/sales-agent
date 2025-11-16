import { Action } from "@copilotkit/shared";

/**
 * Creates a Gmail create draft action for CopilotKit
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns CopilotKit action for creating email drafts
 */
export function createGmailCreateDraftAction(
  getAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "gmail_create_draft",
    description:
      "Create an email draft in Gmail. The draft can be reviewed and sent manually later. Use this when you want human approval before sending.",
    parameters: [
      {
        name: "message",
        type: "string",
        description: "The email body/content",
        required: true,
      },
      {
        name: "to",
        type: "string[]",
        description: "Array of recipient email addresses",
        required: true,
      },
      {
        name: "subject",
        type: "string",
        description: "Email subject line",
        required: true,
      },
      {
        name: "cc",
        type: "string[]",
        description: "Array of CC email addresses",
        required: false,
      },
      {
        name: "bcc",
        type: "string[]",
        description: "Array of BCC email addresses",
        required: false,
      },
    ],
    handler: async ({ message, to, subject, cc, bcc }) => {
      const { GmailCreateDraft } = await import(
        "@langchain/community/tools/gmail"
      );
      const token = await getAccessToken();
      const draftTool = new GmailCreateDraft({
        credentials: { accessToken: async () => token },
      });
      const result = await draftTool.invoke({ message, to, subject, cc, bcc });
      return result;
    },
  };
}
