import { Action } from "@copilotkit/shared";
import { createGmailSearchAction } from "./gmail/search";
import { createGmailGetMessageAction } from "./gmail/get-message";
import { createGmailGetThreadAction } from "./gmail/get-thread";
import { createGmailCreateDraftAction } from "./gmail/create-draft";
import { createGmailSendMessageAction } from "./gmail/send-message";
import { createRetrieveBrochureAction } from "./brochure/retrieve-brochure";

/**
 * Creates all CopilotKit actions for the sales assistant
 * @param getAccessToken Function that returns the user's Gmail OAuth token
 * @returns Array of CopilotKit actions
 */
export function createAllActions(
  getAccessToken: () => Promise<string>
): Action<any>[] {
  return [
    createGmailSearchAction(getAccessToken),
    createGmailGetMessageAction(getAccessToken),
    createGmailGetThreadAction(getAccessToken),
    createGmailCreateDraftAction(getAccessToken),
    createGmailSendMessageAction(getAccessToken),
    createRetrieveBrochureAction(),
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
};
