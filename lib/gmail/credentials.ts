import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Gets an access token function that can be used by LangChain Gmail tools
 * Uses Clerk's getToken() method which handles token refresh automatically
 */
export async function getGmailAccessTokenFunction(): Promise<() => Promise<string>> {
  return async () => {
    const { getToken } = await auth();

    // Get the OAuth token for Gmail from Clerk
    // Make sure you have configured the OAuth provider in Clerk Dashboard
    const token = await getToken({ template: "oauth_google" });

    if (!token) {
      throw new Error("Failed to get Gmail OAuth token from Clerk. Ensure Gmail OAuth is configured.");
    }

    return token;
  };
}

