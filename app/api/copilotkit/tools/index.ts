import { Action } from "@copilotkit/shared";
import { createGmailSearchAction } from "./gmail/search";
import { createGmailGetMessageAction } from "./gmail/get-message";
import { createGmailGetThreadAction } from "./gmail/get-thread";
import { createGmailCreateDraftAction } from "./gmail/create-draft";
import { createGmailSendMessageAction } from "./gmail/send-message";
import { createRetrieveBrochureAction } from "./brochure/retrieve-brochure";
import { createPrepareReplyAction } from "./gmail/prepare-reply";
import { createConfirmReplyAction } from "./gmail/confirm-reply";
import { createDriveReadDocumentAction } from "./drive/read-document";

/**
 * Creates all CopilotKit actions for the sales assistant
 * @param getGmailAccessToken Function that returns the user's Gmail OAuth token
 * @param getDriveAccessToken Function that returns the user's Drive OAuth token
 * @returns Array of CopilotKit actions
 */
interface ActionOptions {
  customInstructions?: string;
}

export function createAllActions(
  getGmailAccessToken: () => Promise<string>,
  getDriveAccessToken: () => Promise<string>,
  options?: ActionOptions
): Action<any>[] {
  return [
    createGmailSearchAction(getGmailAccessToken),
    createGmailGetMessageAction(getGmailAccessToken),
    createGmailGetThreadAction(getGmailAccessToken),
    createGmailCreateDraftAction(getGmailAccessToken),
    createGmailSendMessageAction(getGmailAccessToken),
    createRetrieveBrochureAction(),
    createPrepareReplyAction(getGmailAccessToken, options),
    createConfirmReplyAction(getGmailAccessToken),
    createDriveReadDocumentAction(getDriveAccessToken),
  ];
}

// Export individual action creators for flexibility
export {
  createGmailSearchAction,
  createGmailGetMessageAction,
  createGmailGetThreadAction,
  createGmailCreateDraftAction,
  createGmailSendMessageAction,
  createRetrieveBrochureAction,
  createPrepareReplyAction,
  createConfirmReplyAction,
  createDriveReadDocumentAction,
};
