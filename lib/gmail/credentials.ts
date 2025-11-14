import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Gets an access token function that can be used by LangChain Gmail tools
 * Retrieves the Google OAuth token directly from Clerk's OAuth provider
 */
export async function getGmailAccessTokenFunction(): Promise<() => Promise<string>> {
  const { userId } = await auth();

  console.log('[Gmail Credentials] Initializing token function for user:', userId);

  if (!userId) {
    console.error('[Gmail Credentials] Error: User not authenticated');
    throw new Error("User not authenticated");
  }

  let callCount = 0;

  return async () => {
    callCount++;
    const startTime = Date.now();
    console.log(`[Gmail Credentials] Token function called (call #${callCount}) for user:`, userId);

    try {
      const client = await clerkClient();

      // Get the user's OAuth access tokens from Clerk
      const user = await client.users.getUser(userId);
      console.log('[Gmail Credentials] Retrieved user data from Clerk', {
        externalAccountCount: user.externalAccounts.length,
        providers: user.externalAccounts.map(acc => ({
          provider: acc.provider,
          verified: acc.verification?.status === "verified"
        }))
      });

      // Find the Google OAuth provider account
      // Note: Clerk may use either "google" or "oauth_google" as the provider name
      const googleAccount = user.externalAccounts.find(
        (account) => (account.provider === "google" || account.provider === "oauth_google") &&
                     account.verification?.status === "verified"
      );

      if (!googleAccount) {
        const googleAccountsUnverified = user.externalAccounts.filter(
          (account) => account.provider === "google" || account.provider === "oauth_google"
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

      console.log('[Gmail Credentials] Found verified Google account', {
        provider: googleAccount.provider
      });

      // Get the OAuth access token
      // Clerk automatically refreshes tokens when they expire
      // Use the actual provider name from the account (could be "google" or "oauth_google")
      const providerName = googleAccount.provider as "oauth_google" | "google";
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

      const duration = Date.now() - startTime;
      console.log(`[Gmail Credentials] Successfully retrieved access token (${duration}ms)`, {
        tokenLength: accessToken.length,
        tokenPrefix: accessToken.substring(0, 20) + '...'
      });

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

