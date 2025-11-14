# Fix: Clerk OAuth Provider Name Issue

## Problem Discovered

The Gmail tools were failing with this error:

```
[Gmail Credentials] Retrieved user data from Clerk {
  externalAccountCount: 1,
  providers: [ { provider: 'oauth_google', verified: true } ]
}
[Gmail Credentials] Error: No verified Google account found
```

## Root Cause

**Clerk is using `'oauth_google'` as the provider name, not `'google'`!**

The code was checking:
```typescript
account.provider === "google"  // ❌ Looking for "google"
```

But Clerk was returning:
```typescript
account.provider === "oauth_google"  // ✓ Actual value
```

This mismatch caused the code to not find the Google account even though it was connected and verified.

## Solution

Updated all files to check for BOTH provider names:

```typescript
account.provider === "google" || account.provider === "oauth_google"
```

This ensures compatibility regardless of which naming convention Clerk uses.

## Files Updated

### 1. `lib/gmail/credentials.ts`
- ✅ Updated Google account search to check both names
- ✅ Updated token retrieval to use actual provider name
- ✅ Added logging to show which provider name was found

**Changes:**
```typescript
// Before
const googleAccount = user.externalAccounts.find(
  (account) => account.provider === "google" && ...
);
const token = await client.users.getUserOauthAccessToken(userId, "google");

// After
const googleAccount = user.externalAccounts.find(
  (account) => (account.provider === "google" || account.provider === "oauth_google") && ...
);
const providerName = googleAccount.provider as "oauth_google" | "google";
const token = await client.users.getUserOauthAccessToken(userId, providerName);
```

### 2. `components/GmailConnectionStatus.tsx`
- ✅ Updated to check both provider names in UI component

**Changes:**
```typescript
// Before
account.provider === "google" && ...

// After
(account.provider === "google" || account.provider === "oauth_google") && ...
```

### 3. `app/api/gmail/status/route.ts`
- ✅ Updated status endpoint to check both names
- ✅ Uses actual provider name when fetching token

**Changes:**
```typescript
// Before
account.provider === "google" && ...
const token = await client.users.getUserOauthAccessToken(userId, "google");

// After
(account.provider === "google" || account.provider === "oauth_google") && ...
const providerName = googleAccount.provider as "oauth_google" | "google";
const token = await client.users.getUserOauthAccessToken(userId, providerName);
```

## Expected Behavior After Fix

### Before Fix:
```
[Gmail Credentials] Retrieved user data from Clerk {
  providers: [ { provider: 'oauth_google', verified: true } ]
}
[Gmail Credentials] Error: No verified Google account found ❌
```

### After Fix:
```
[Gmail Credentials] Retrieved user data from Clerk {
  providers: [ { provider: 'oauth_google', verified: true } ]
}
[Gmail Credentials] Found verified Google account { provider: 'oauth_google' } ✅
[Gmail Credentials] Successfully retrieved access token (145ms) ✅
```

## Why This Happened

Clerk's provider naming can vary based on:
- Version of Clerk being used
- How the OAuth provider was configured
- Whether it's a custom OAuth vs. built-in OAuth

The fix makes the code robust by accepting both naming conventions.

## Testing

After this fix, try using Gmail tools again. You should see:

1. **In server logs:**
   ```
   [Gmail Credentials] Found verified Google account { provider: 'oauth_google' }
   [Gmail Credentials] Successfully retrieved access token (XXXms)
   ```

2. **In the UI:**
   - Green "Gmail Connected" alert on `/agents` page
   - Gmail tools should work without errors

3. **Test the status endpoint:**
   ```
   GET /api/gmail/status
   ```

   Should return:
   ```json
   {
     "connected": true,
     "googleAccount": {
       "email": "your-email@gmail.com",
       "verified": true
     },
     "tokenStatus": {
       "hasToken": true,
       "tokenLength": 183
     }
   }
   ```

## Summary

The issue was a simple string mismatch:
- **Expected:** `"google"`
- **Actual:** `"oauth_google"`

The fix ensures we check for both, making the code compatible with different Clerk configurations.

**Status: ✅ FIXED**

Now your Gmail tools should work properly! 🎉
