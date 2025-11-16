import { Action } from "@copilotkit/shared";

/**
 * Creates a Gmail get message action for CopilotKit
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns CopilotKit action for retrieving a specific email
 */
export function createGmailGetMessageAction(
  getAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "gmail_get_message",
    description:
      "Get the full content of a specific email by ID. Returns the email body, subject, sender, and other metadata.",
    parameters: [
      {
        name: "messageId",
        type: "string",
        description: "The Gmail message ID to retrieve",
        required: true,
      },
    ],
    handler: async ({ messageId }) => {
      const { GmailGetMessage } = await import(
        "@langchain/community/tools/gmail"
      );
      const token = await getAccessToken();
      const getTool = new GmailGetMessage({
        credentials: { accessToken: async () => token },
      });
      const result = await getTool.invoke({ messageId });
      return result;
    },
  };
}
