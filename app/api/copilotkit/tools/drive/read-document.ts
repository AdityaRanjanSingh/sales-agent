import { Action } from "@copilotkit/shared";

/**
 * Creates the Drive read document action
 * Allows reading content from Google Drive documents (Docs/Sheets)
 * @param getDriveAccessToken Function that returns the user's Drive OAuth token
 * @returns CopilotKit action for reading Drive documents
 */
export function createDriveReadDocumentAction(
  getDriveAccessToken: () => Promise<string>,
): Action<any> {
  return {
    name: "drive_read_document",
    description:
      "Reads content from a Google Drive document (Google Docs or Google Sheets) and returns it in markdown format. Accepts either a Google Drive URL or a file ID.",
    parameters: [
      {
        name: "documentId",
        type: "string",
        description:
          "The Google Drive document ID or full URL (e.g., 'https://docs.google.com/document/d/abc123/edit' or just 'abc123')",
        required: true,
      },
    ],
    handler: async ({ documentId }) => {
      const { DriveReadDocumentTool } = await import(
        "@/lib/drive/read-document-tool"
      );
      const token = await getDriveAccessToken();
      const driveTool = new DriveReadDocumentTool({
        credentials: { accessToken: async () => token },
      });
      const result = await driveTool.invoke({ documentId });
      return result;
    },
  };
}
