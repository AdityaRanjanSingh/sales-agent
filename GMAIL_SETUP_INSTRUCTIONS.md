# Gmail Integration Setup Instructions

## Current Error: "No verified Google account found"

Your logging shows that users are trying to use Gmail tools without connecting their Google account. This guide will help you fix this.

## Quick Fix for Testing

### Option 1: Connect Google Account (For Current User)

1. **Navigate to the agents page** at `/agents`
2. **Look for the yellow alert box** that says "Gmail Not Connected"
3. **Click "Connect Google Account"** button
4. **Follow Clerk's prompts** to connect your Google account
5. **Grant Gmail permissions** when requested
6. **Return to the agents page** and try using Gmail tools again

### Option 2: Sign Out and Sign In with Google

1. **Sign out** of your current account
2. **Navigate to sign-in page**
3. **Click "Continue with Google"** (if available)
4. **Authorize Gmail permissions**
5. **Return to agents page** and test

## Prerequisites Check

Before users can use Gmail tools, ensure these are configured:

### 1. Clerk Dashboard Configuration

**Location:** https://dashboard.clerk.com → Your Application → SSO Connections

**Steps:**
1. Go to **SSO Connections** → **OAuth**
2. Enable **Google** provider
3. Click on **Google** to configure
4. Add **OAuth Scopes** (critical for Gmail access):
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.compose
   ```
5. Ensure **OAuth is enabled** for your application
6. Note the **Redirect URIs** that Clerk provides

### 2. Google Cloud Console Setup

**Location:** https://console.cloud.google.com

**Steps:**
1. **Create or select a project**
2. **Enable Gmail API:**
   - Go to APIs & Services → Library
   - Search for "Gmail API"
   - Click "Enable"

3. **Configure OAuth Consent Screen:**
   - Go to APIs & Services → OAuth consent screen
   - Choose "External" user type (or Internal for Google Workspace)
   - Fill in app name, support email
   - Add scopes:
     - `.../auth/gmail.readonly`
     - `.../auth/gmail.send`
     - `.../auth/gmail.modify`
     - `.../auth/gmail.compose`
   - Add test users if needed
   - Submit for verification (or keep in testing mode)

4. **Create OAuth 2.0 Credentials:**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add **Authorized redirect URIs** from Clerk Dashboard
   - Copy **Client ID** and **Client Secret**

5. **Add credentials to Clerk:**
   - Return to Clerk Dashboard → Google OAuth settings
   - Paste Client ID and Client Secret
   - Save

### 3. Verify Sign-In Flow

**Check your sign-in page includes Google OAuth:**

Your sign-in page (`/sign-in`) uses Clerk's `<SignIn>` component, which should automatically show Google sign-in if configured correctly.

**Test it:**
1. Go to `/sign-in`
2. You should see "Continue with Google" button
3. If not visible, check Clerk Dashboard settings

## New Components Added

### GmailConnectionStatus Component

**File:** `components/GmailConnectionStatus.tsx`

This component:
- ✅ Checks if user has connected Google account
- ✅ Shows green alert if connected
- ✅ Shows yellow alert with "Connect" button if not connected
- ✅ Uses Clerk's `useUser` hook to check verification status

**Already integrated into:** `/agents` page

### Enhanced Logging

**Files updated:**
- `lib/gmail/credentials.ts` - Token retrieval logging
- `lib/gmail/tools.ts` - Tool creation logging
- `app/api/chat/agents/route.ts` - Agent and tool execution logging

**Logs now show:**
```
[Gmail Credentials] Retrieved user data from Clerk {
  externalAccountCount: 0,
  providers: []
}
```

This tells you exactly what accounts the user has connected.

## Testing the Fix

### 1. Check Current Logs

When you try to use Gmail tools now, you should see:

```
[Gmail Credentials] Retrieved user data from Clerk {
  externalAccountCount: X,
  providers: [
    { provider: 'google', verified: false }  // or true if connected
  ]
}
```

If `providers` is empty or shows `verified: false`, the user needs to connect Google.

### 2. Connect Google Account

The new `GmailConnectionStatus` component on `/agents` page will guide users to connect their account.

### 3. Verify Connection

After connecting:
1. Refresh the `/agents` page
2. Alert should turn **green** saying "Gmail Connected"
3. Try using Gmail tools
4. Check server logs for:
   ```
   [Gmail Credentials] Found verified Google account
   [Gmail Credentials] Successfully retrieved access token (XXXms)
   ```

## Common Issues

### Issue: "Continue with Google" not showing on sign-in

**Cause:** Google OAuth not enabled in Clerk
**Fix:**
1. Check Clerk Dashboard → SSO Connections → Google
2. Toggle it ON
3. Save changes

### Issue: Users connect Google but still get error

**Cause:** OAuth scopes not configured correctly
**Fix:**
1. Check Clerk Dashboard → Google OAuth → Scopes
2. Ensure all 4 Gmail scopes are added
3. User may need to reconnect to grant new scopes

### Issue: "Failed to get Gmail OAuth token"

**Cause:** Google Cloud credentials not linked to Clerk
**Fix:**
1. Verify Client ID and Secret in Clerk Dashboard
2. Check redirect URIs match exactly
3. Ensure Gmail API is enabled in Google Cloud

## Expected User Flow

### For New Users:
1. Navigate to `/sign-in`
2. Click "Continue with Google"
3. Authorize Gmail permissions
4. Redirected to `/agents` page
5. Green alert shows "Gmail Connected"
6. Can use Gmail tools immediately

### For Existing Users:
1. Navigate to `/agents` page
2. See yellow alert "Gmail Not Connected"
3. Click "Connect Google Account"
4. Opens Clerk user profile in new tab
5. Connect Google account
6. Return to `/agents` page and refresh
7. Green alert shows "Gmail Connected"
8. Can use Gmail tools

## Verification Checklist

- [ ] Google OAuth enabled in Clerk Dashboard
- [ ] All 4 Gmail scopes configured in Clerk
- [ ] Gmail API enabled in Google Cloud Console
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Secret added to Clerk
- [ ] Redirect URIs match between Google and Clerk
- [ ] "Continue with Google" button visible on `/sign-in`
- [ ] `GmailConnectionStatus` component showing on `/agents` page
- [ ] Enhanced logging working (check server console)

## Next Steps

1. **Complete Clerk configuration** as described above
2. **Test with your own account** by connecting Google
3. **Verify logs show** connection success
4. **Test Gmail tools** work correctly
5. **Deploy to production** once verified

## Support

If issues persist after following this guide:
1. Check server logs for detailed error messages
2. Review `GMAIL_LOGGING_GUIDE.md` for debugging help
3. Verify all scopes are correctly configured
4. Check Google Cloud Console audit logs
5. Review Clerk Dashboard → Logs for OAuth flow issues
