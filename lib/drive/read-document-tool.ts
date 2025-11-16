import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";
import type { DriveCredentials, DriveDocumentContent } from "./types";

const DriveReadDocumentInputSchema = z.object({
  documentId: z.string().describe("The Google Drive document ID or full URL (e.g., 'https://docs.google.com/document/d/abc123/edit' or just 'abc123')"),
});

/**
 * Extracts the file ID from various Google Drive URL formats
 */
function extractFileIdFromUrl(input: string): string {
  // If it doesn't look like a URL, assume it's already a file ID
  if (!input.includes('google.com') && !input.includes('/')) {
    return input;
  }

  // Handle various Google Drive URL formats:
  // - https://docs.google.com/document/d/FILE_ID/edit
  // - https://docs.google.com/spreadsheets/d/FILE_ID/edit
  // - https://docs.google.com/presentation/d/FILE_ID/edit
  // - https://drive.google.com/file/d/FILE_ID/view
  // - https://drive.google.com/open?id=FILE_ID

  // Try to match /d/FILE_ID pattern
  const dMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) {
    return dMatch[1];
  }

  // Try to match ?id=FILE_ID pattern
  const idMatch = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return idMatch[1];
  }

  // If no pattern matches, return the input as-is and let Google API handle the error
  return input;
}

/**
 * Converts Google Docs content to markdown format
 */
function convertDocsToMarkdown(content: string): string {
  // Google Docs exports as plain text with some formatting preserved
  // This is a basic conversion - the actual content from exportLinks is already reasonably formatted
  return content.trim();
}

/**
 * Converts CSV content to markdown table format
 */
function convertCsvToMarkdown(csv: string): string {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return '';

  // Parse CSV (simple implementation, handles basic cases)
  const rows = lines.map(line => {
    // Handle quoted values with commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });

  if (rows.length === 0) return '';

  // Build markdown table
  let markdown = '';

  // Header row
  markdown += '| ' + rows[0].join(' | ') + ' |\n';

  // Separator row
  markdown += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    markdown += '| ' + rows[i].join(' | ') + ' |\n';
  }

  return markdown;
}

export class DriveReadDocumentTool extends DynamicStructuredTool {
  private credentials: DriveCredentials;

  constructor({ credentials }: { credentials: DriveCredentials }) {
    super({
      name: "drive_read_document",
      description: "Reads content from a Google Drive document (Google Docs or Google Sheets) and returns it in markdown format. Accepts either a Google Drive URL or a file ID. Use this when you need to access document content from the user's Google Drive.",
      schema: DriveReadDocumentInputSchema,
      func: async ({ documentId }): Promise<string> => {
        try {
          // Extract file ID from URL if needed
          const fileId = extractFileIdFromUrl(documentId);

          // Get OAuth access token
          const accessToken = await credentials.accessToken();

          // Create OAuth2 client
          const oauth2Client = new google.auth.OAuth2();
          oauth2Client.setCredentials({ access_token: accessToken });

          // Create Drive API client
          const drive = google.drive({ version: 'v3', auth: oauth2Client });

          // Get file metadata to determine the type
          const fileMetadata = await drive.files.get({
            fileId,
            fields: 'id,name,mimeType,modifiedTime,owners,exportLinks,webViewLink',
          });

          const mimeType = fileMetadata.data.mimeType;
          const fileName = fileMetadata.data.name || 'Untitled';

          let content = '';

          // Handle Google Docs
          if (mimeType === 'application/vnd.google-apps.document') {
            // Export as plain text (we'll format it as markdown)
            const response = await drive.files.export({
              fileId,
              mimeType: 'text/plain',
            }, {
              responseType: 'text',
            });

            content = convertDocsToMarkdown(response.data as string);
          }
          // Handle Google Sheets
          else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            // Export as CSV and convert to markdown table
            const response = await drive.files.export({
              fileId,
              mimeType: 'text/csv',
            }, {
              responseType: 'text',
            });

            content = convertCsvToMarkdown(response.data as string);
          }
          // Handle other file types
          else {
            const result: DriveDocumentContent = {
              success: false,
              error: `Unsupported file type: ${mimeType}. This tool only supports Google Docs and Google Sheets.`,
              metadata: {
                title: fileName,
                mimeType: mimeType || 'unknown',
                documentId: fileId,
                modifiedTime: fileMetadata.data.modifiedTime || undefined,
                owner: fileMetadata.data.owners?.[0]?.displayName || undefined,
              },
            };
            return JSON.stringify(result);
          }

          const result: DriveDocumentContent = {
            success: true,
            content,
            metadata: {
              title: fileName,
              mimeType: mimeType || 'unknown',
              documentId: fileId,
              modifiedTime: fileMetadata.data.modifiedTime || undefined,
              owner: fileMetadata.data.owners?.[0]?.displayName || undefined,
            },
          };

          return JSON.stringify(result);
        } catch (error: any) {
          // Handle specific Google API errors
          if (error.code === 404) {
            const result: DriveDocumentContent = {
              success: false,
              error: 'Document not found. Please check that the document ID or URL is correct and that you have access to it.',
            };
            return JSON.stringify(result);
          }

          if (error.code === 403) {
            const result: DriveDocumentContent = {
              success: false,
              error: 'Permission denied. You do not have access to this document.',
            };
            return JSON.stringify(result);
          }

          const result: DriveDocumentContent = {
            success: false,
            error: `Error reading document: ${error instanceof Error ? error.message : String(error)}`,
          };
          return JSON.stringify(result);
        }
      },
    });

    this.credentials = credentials;
  }
}
