import { Action } from "@copilotkit/shared";

/**
 * Creates a Gmail get thread action for CopilotKit
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns CopilotKit action for retrieving an email thread
 */
export function createGmailGetThreadAction(
  getAccessToken: () => Promise<string>
): Action<any> {
  return {
    name: "gmail_get_thread",
    description:
      "Get an entire email thread/conversation by ID. Useful for understanding the full context of an email exchange.",
    parameters: [
      {
        name: "threadId",
        type: "string",
        description: "The Gmail thread ID to retrieve",
        required: true,
      },
    ],
    handler: async ({ threadId }) => {
      const { GmailGetThread } = await import(
        "@langchain/community/tools/gmail"
      );
      const token = await getAccessToken();
      const threadTool = new GmailGetThread({
        credentials: { accessToken: async () => token },
      });
      const result = await threadTool.invoke({ threadId });
      return result;
    },
  };
}
