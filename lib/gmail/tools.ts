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
  const credentials = { accessToken: getAccessToken };

  return {
    search: new GmailSearch({ credentials }),
    getMessage: new GmailGetMessage({ credentials }),
    getThread: new GmailGetThread({ credentials }),
    createDraft: new GmailCreateDraft({ credentials }),
    sendMessage: new GmailSendMessage({ credentials }),
  };
}
