/**
 * Type definitions for Google Drive integration
 */

export interface DriveDocumentContent {
  success: boolean;
  content?: string;
  metadata?: {
    title: string;
    mimeType: string;
    documentId: string;
    modifiedTime?: string;
    owner?: string;
  };
  error?: string;
}

export interface DriveCredentials {
  accessToken: () => Promise<string>;
}

export type DocumentFormat = "markdown" | "text" | "csv";

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}
