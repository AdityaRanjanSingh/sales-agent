import {
  GmailSearch,
  GmailGetMessage,
  GmailGetThread,
  GmailCreateDraft,
  GmailSendMessage,
} from "@langchain/community/tools/gmail";

/**
 * Factory function to create Gmail tools with proper OAuth2 configuration
 * The googleapis package must be installed for these tools to work
 */
export function createGmailTools(getAccessToken: () => Promise<string>) {
  // Wrap the access token function to add error handling
  const wrappedGetAccessToken = async () => {
    try {
      const token = await getAccessToken();
      return token;
    } catch (error) {
      console.error('[Gmail Tools] Failed to get access token:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const credentials = { accessToken: wrappedGetAccessToken };

  try {
    const tools = {
      search: new GmailSearch({ credentials }),
      getMessage: new GmailGetMessage({ credentials }),
      getThread: new GmailGetThread({ credentials }),
      createDraft: new GmailCreateDraft({ credentials }),
      sendMessage: new GmailSendMessage({ credentials }),
    };

    return tools;
  } catch (error) {
    console.error('[Gmail Tools] Error creating Gmail tools:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
