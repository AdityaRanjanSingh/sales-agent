/**
 * Customer History Tool
 * Searches Gmail for previous email interactions with a specific customer
 * Provides context about past conversations for more informed replies
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { GmailSearch } from "@langchain/community/tools/gmail";
import { z } from "zod";

const CustomerHistoryInputSchema = z.object({
  customerEmail: z
    .string()
    .email()
    .describe("The email address of the customer to search for"),
});

/**
 * Create a tool for retrieving customer email history from Gmail
 */
export function createCustomerHistoryTool(
  getAccessToken: () => Promise<string>,
  maxResults: number = 10
) {
  return new DynamicStructuredTool({
    name: "search_customer_history",
    description: `Search for previous email interactions with a specific customer to understand conversation history and relationship context.

Input should be the customer's email address (e.g., "john@acme.com").

Returns a summary of past email exchanges including:
- Number of previous emails
- Recent conversation topics
- Key details from past interactions

Use this to personalize replies and maintain conversation continuity.`,
    schema: CustomerHistoryInputSchema,
    func: async ({ customerEmail }: { customerEmail: string }): Promise<string> => {
      try {
        console.log(
          `[CustomerHistoryTool] Searching for emails from/to: ${customerEmail}`
        );

        // Create Gmail search tool
        const token = await getAccessToken();
        const gmailSearch = new GmailSearch({
          credentials: {
            accessToken: async () => token,
          },
        });

        // Search for emails from or to this customer
        // Exclude the current thread by limiting to older emails
        const query = `from:${customerEmail} OR to:${customerEmail}`;

        const searchResult = await gmailSearch.invoke({
          query,
          maxResults,
        });

        // Parse the search results
        if (!searchResult || searchResult.includes("No results found")) {
          return `No previous email history found for ${customerEmail}. This appears to be a new customer or first interaction.`;
        }

        // Format the results for the agent
        const formattedHistory = formatSearchResults(
          searchResult,
          customerEmail
        );

        return formattedHistory;
      } catch (error) {
        console.error("[CustomerHistoryTool] Error searching history:", error);
        return `Error retrieving customer history: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
}

/**
 * Format search results into a readable summary
 */
function formatSearchResults(
  searchResult: string,
  customerEmail: string
): string {
  // The search result from GmailSearch is a formatted string
  // Parse it to create a more concise summary
  const lines = searchResult.split("\n").filter((line) => line.trim());

  // Count the number of emails found
  const emailCount = lines.filter((line) =>
    line.includes("Subject:")
  ).length;

  if (emailCount === 0) {
    return `No previous email history found for ${customerEmail}.`;
  }

  // Create summary
  let summary = `Found ${emailCount} previous email(s) with ${customerEmail}:\n\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `CUSTOMER HISTORY\n`;
  summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Include the raw search results (already formatted by GmailSearch)
  summary += searchResult;

  summary += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `\nUse this context to personalize your reply and maintain continuity with past conversations.`;

  return summary;
}
