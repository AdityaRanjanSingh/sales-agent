import { Action } from "@copilotkit/shared";

/**
 * Creates a Gmail send message action for CopilotKit
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns CopilotKit action for sending emails directly
 */
export function createGmailSendMessageAction(
  getAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "gmail_send_message",
    description:
      "Send an email directly via Gmail. Use with caution - the email will be sent immediately without human review.",
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
      const { GmailSendMessage } = await import(
        "@langchain/community/tools/gmail"
      );
      const token = await getAccessToken();
      const sendTool = new GmailSendMessage({
        credentials: { accessToken: async () => token },
      });
      const result = await sendTool.invoke({ message, to, subject, cc, bcc });
      return result;
    },
  };
}
