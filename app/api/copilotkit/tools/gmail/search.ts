import { Action } from "@copilotkit/shared";

/**
 * Creates a Gmail search action for CopilotKit
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns CopilotKit action for searching emails
 */
export function createGmailSearchAction(
  getAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "gmail_search",
    description:
      "Search for emails in Gmail. Returns matching email IDs and metadata. Use query parameter to filter (e.g., 'is:unread', 'from:customer@example.com').",
    parameters: [
      {
        name: "query",
        type: "string",
        description:
          "Gmail search query string (e.g., 'is:unread', 'from:user@example.com', 'subject:inquiry')",
        required: true,
      },
    ],
    handler: async ({ query }) => {
      const { GmailSearch } = await import("@langchain/community/tools/gmail");
      const token = await getAccessToken();
      const searchTool = new GmailSearch({
        credentials: { accessToken: async () => token },
      });
      const result = await searchTool.invoke({ query });
      return result;
    },
  };
}
