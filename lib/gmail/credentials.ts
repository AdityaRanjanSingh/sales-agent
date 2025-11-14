import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Gets an access token function that can be used by LangChain Gmail tools
 * Retrieves the Google OAuth token directly from Clerk's OAuth provider
 */
export async function getGmailAccessTokenFunction(): Promise<() => Promise<string>> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return async () => {
    const client = await clerkClient();

    // Get the user's OAuth access tokens from Clerk
    const user = await client.users.getUser(userId);

    // Find the Google OAuth provider account
    const googleAccount = user.externalAccounts.find(
      (account) => account.provider === "google" && account.verification?.status === "verified"
    );

    if (!googleAccount) {
      throw new Error(
        "Gmail not connected. Please sign in with Google to enable Gmail integration."
      );
    }

    // Get the OAuth access token
    // Clerk automatically refreshes tokens when they expire
    const token = await client.users.getUserOauthAccessToken(userId, "google");

    if (!token || !token.data || token.data.length === 0) {
      throw new Error(
        "Failed to get Gmail OAuth token. Please reconnect your Google account."
      );
    }

    // Return the access token
    const accessToken = token.data[0]?.token;

    if (!accessToken) {
      throw new Error("OAuth access token is empty");
    }

    return accessToken;
  };
}

