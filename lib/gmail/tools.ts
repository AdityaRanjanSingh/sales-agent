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
  console.log('[Gmail Tools] Creating Gmail tools with access token function');

  // Wrap the access token function to add logging
  const wrappedGetAccessToken = async () => {
    console.log('[Gmail Tools] Access token requested by LangChain tool');
    try {
      const token = await getAccessToken();
      console.log('[Gmail Tools] Access token successfully provided to tool');
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

    console.log('[Gmail Tools] Successfully created all 5 Gmail tools:', {
      tools: Object.keys(tools)
    });

    return tools;
  } catch (error) {
    console.error('[Gmail Tools] Error creating Gmail tools:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
