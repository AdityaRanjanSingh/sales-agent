import { DriveReadDocumentTool } from "./read-document-tool";

/**
 * Factory function to create Google Drive tools with proper OAuth2 configuration
 */
export function createDriveTools(getAccessToken: () => Promise<string>) {
  // Wrap the access token function to add error handling
  const wrappedGetAccessToken = async () => {
    try {
      const token = await getAccessToken();
      return token;
    } catch (error) {
      console.error('[Drive Tools] Failed to get access token:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const credentials = { accessToken: wrappedGetAccessToken };

  try {
    const tools = {
      readDocument: new DriveReadDocumentTool({ credentials }),
    };

    return tools;
  } catch (error) {
    console.error('[Drive Tools] Error creating Drive tools:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
