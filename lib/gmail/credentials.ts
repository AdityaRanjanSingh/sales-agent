import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Gets an access token function that can be used by LangChain Gmail tools
 * Retrieves the Google OAuth token directly from Clerk's OAuth provider
 */
export async function getGmailAccessTokenFunction(): Promise<() => Promise<string>> {
  const { userId } = await auth();

  if (!userId) {
    console.error('[Gmail Credentials] Error: User not authenticated');
    throw new Error("User not authenticated");
  }

  let callCount = 0;

  return async () => {
    callCount++;
    const startTime = Date.now();

    try {
      const client = await clerkClient();

      // Get the user's OAuth access tokens from Clerk
      const user = await client.users.getUser(userId);

      // Find the Google OAuth provider account
      // Note: TypeScript types say "google" but Clerk actually returns "oauth_google" at runtime
      // We need to check both to be safe, and use type assertion to satisfy TypeScript
      const googleAccount = user.externalAccounts.find(
        (account) => (account.provider === "google" || (account.provider as string) === "oauth_google") &&
          account.verification?.status === "verified"
      );

      if (!googleAccount) {
        const googleAccountsUnverified = user.externalAccounts.filter(
          (account) => account.provider === "google" || (account.provider as string) === "oauth_google"
        );

        console.error('[Gmail Credentials] Error: No verified Google account found for user:', userId, {
          totalExternalAccounts: user.externalAccounts.length,
          googleAccountsFound: googleAccountsUnverified.length,
          googleAccountStatuses: googleAccountsUnverified.map(acc => ({
            provider: acc.provider,
            verificationStatus: acc.verification?.status,
            verificationStrategy: acc.verification?.strategy
          }))
        });

        throw new Error(
          "Gmail not connected. Please sign in with Google to enable Gmail integration."
        );
      }

      // Get the OAuth access token
      // Clerk automatically refreshes tokens when they expire
      // Use the actual provider name from the account (will be "oauth_google" at runtime)
      // Cast to string first, then to the expected type to handle TypeScript type mismatch
      const providerName = googleAccount.provider as string as "oauth_google";
      const token = await client.users.getUserOauthAccessToken(userId, providerName);

      if (!token || !token.data || token.data.length === 0) {
        console.error('[Gmail Credentials] Error: Failed to retrieve OAuth token from Clerk', {
          hasToken: !!token,
          hasData: !!token?.data,
          dataLength: token?.data?.length || 0
        });
        throw new Error(
          "Failed to get Gmail OAuth token. Please reconnect your Google account."
        );
      }

      // Return the access token
      const accessToken = token.data[0]?.token;

      if (!accessToken) {
        console.error('[Gmail Credentials] Error: Access token is empty or undefined');
        throw new Error("OAuth access token is empty");
      }

      return accessToken;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Gmail Credentials] Error retrieving token (${duration}ms):`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };
}

