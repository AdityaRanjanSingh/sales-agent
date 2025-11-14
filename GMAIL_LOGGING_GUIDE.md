# Gmail Tools Logging & Debugging Guide

## Overview
Comprehensive logging has been added to the Gmail tools integration to help diagnose and fix errors during tool execution. This guide explains what's been logged and how to use it.

## What Was Added

### 1. Token Retrieval Logging (`lib/gmail/credentials.ts`)

**Location:** `lib/gmail/credentials.ts`

**Logs Added:**
- ✅ Token function initialization with user ID
- ✅ Each token request with call counter and timing
- ✅ Successful token retrieval with token length preview
- ✅ Detailed error logging with stack traces
- ✅ All Clerk API interaction steps

**Example Output:**
```
[Gmail Credentials] Initializing token function for user: user_abc123
[Gmail Credentials] Token function called (call #1) for user: user_abc123
[Gmail Credentials] Retrieved user data from Clerk
[Gmail Credentials] Found verified Google account
[Gmail Credentials] Successfully retrieved access token (145ms) {
  tokenLength: 183,
  tokenPrefix: 'ya29.a0AfH6SMBvq...'
}
```

**Error Example:**
```
[Gmail Credentials] Error: No verified Google account found for user: user_abc123
```

### 2. Gmail Tools Creation Logging (`lib/gmail/tools.ts`)

**Location:** `lib/gmail/tools.ts`

**Logs Added:**
- ✅ Tool creation initiation
- ✅ Access token requests from LangChain tools
- ✅ Successful tool creation with tool names
- ✅ Wrapped access token function with error tracking

**Example Output:**
```
[Gmail Tools] Creating Gmail tools with access token function
[Gmail Tools] Successfully created all 5 Gmail tools: {
  tools: [ 'search', 'getMessage', 'getThread', 'createDraft', 'sendMessage' ]
}
[Gmail Tools] Access token requested by LangChain tool
[Gmail Tools] Access token successfully provided to tool
```

### 3. Agent Route Logging (`app/api/chat/agents/route.ts`)

**Location:** `app/api/chat/agents/route.ts`

**Logs Added:**
- ✅ Request tracking with unique request ID
- ✅ Message count and preview
- ✅ Gmail access token initialization tracking
- ✅ Tool assembly logging
- ✅ Agent creation and execution start
- ✅ **Tool call tracking** - Each tool invocation with:
  - Tool name
  - Input parameters (truncated to 200 chars)
  - Output preview (truncated to 200 chars)
  - Tool errors
- ✅ Total tool call counter
- ✅ Execution timing for non-streaming mode
- ✅ Enhanced error categorization and logging

**Example Output:**
```
[Agent Route j7k2p3] ===== New chat request =====
[Agent Route j7k2p3] Request parameters: { messageCount: 3, returnIntermediateSteps: false }
[Agent Route j7k2p3] Filtered messages: { count: 3, lastMessage: 'Check for brochure requests' }
[Agent Route j7k2p3] Initializing Gmail access token function...
[Agent Route j7k2p3] Gmail access token function created successfully
[Agent Route j7k2p3] Creating Gmail tools...
[Agent Route j7k2p3] Gmail tools created successfully
[Agent Route j7k2p3] All tools assembled: {
  toolCount: 6,
  toolNames: [ 'gmail_search', 'gmail_get_message', 'gmail_get_thread', 'gmail_create_draft', 'gmail_send_message', 'retrieve_brochure' ]
}
[Agent Route j7k2p3] Creating ReAct agent with LangGraph...
[Agent Route j7k2p3] Agent created, starting execution...
[Agent Route j7k2p3] Streaming mode enabled
[Agent Route j7k2p3] Tool call #1 started: { tool: 'gmail_search', input: 'is:unread brochure' }
[Agent Route j7k2p3] Tool call completed: { tool: 'gmail_search', outputPreview: '[{"id":"msg123","threadId":"thread456"..."}]' }
[Agent Route j7k2p3] Tool call #2 started: { tool: 'gmail_get_message', input: 'msg123' }
[Agent Route j7k2p3] Tool call completed: { tool: 'gmail_get_message', outputPreview: 'From: customer@example.com\nSubject: Brochure Request...' }
[Agent Route j7k2p3] Stream completed. Total tool calls: 5
```

### 4. Frontend Error Handling (`components/ChatWindow.tsx`)

**Location:** `components/ChatWindow.tsx`

**Improvements:**
- ✅ Console logging of all errors
- ✅ Smart error categorization:
  - Gmail connection errors
  - OAuth/authentication errors
  - Tool execution errors
  - Generic errors
- ✅ User-friendly error titles and descriptions
- ✅ Extended toast duration (5 seconds)
- ✅ Error details from server included

**Example User Messages:**
- **Gmail Not Connected:** "Please connect your Google account in settings to use the sales assistant."
- **Authentication Error:** "There was a problem with your Google account. Please try reconnecting."
- **Tool Execution Failed:** "The assistant encountered an error. Check the server logs for details."

## How to Debug Gmail Tool Errors

### Step 1: Check Server Logs
When you run `npm run dev`, watch the terminal for log output. Each request gets a unique ID (e.g., `j7k2p3`) that you can follow through the entire execution.

### Step 2: Identify the Error Location
Look for the error prefix to know where it occurred:
- `[Gmail Credentials]` - OAuth token retrieval issue
- `[Gmail Tools]` - Tool creation or access token wrapper issue
- `[Agent Route]` - Agent initialization or tool execution issue
- `[ChatWindow]` - Frontend error display

### Step 3: Common Error Patterns

#### Error: "User not authenticated"
**Location:** `lib/gmail/credentials.ts:14`
**Cause:** User is not logged in
**Fix:** Ensure user is authenticated with Clerk

#### Error: "Gmail not connected"
**Location:** `lib/gmail/credentials.ts:48`
**Cause:** User doesn't have a verified Google account linked

**What the logs show:**
```
[Gmail Credentials] Error: No verified Google account found for user: user_xxx {
  totalExternalAccounts: 0,
  googleAccountsFound: 0,
  googleAccountStatuses: []
}
```

**Fix:**
1. **User needs to connect Google account:**
   - User must sign in with Google or connect Google to their existing account
   - A `GmailConnectionStatus` component has been added to `/agents` page
   - Users can click "Connect Google Account" button to link their account

2. **Verify Clerk Dashboard configuration:**
   - Go to Clerk Dashboard → SSO Connections
   - Enable Google OAuth provider
   - Add required Gmail API scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.compose`

3. **Check Google Cloud Console:**
   - Gmail API must be enabled
   - OAuth 2.0 credentials configured
   - Authorized redirect URIs from Clerk added

#### Error: "Failed to get Gmail OAuth token"
**Location:** `lib/gmail/credentials.ts:51`
**Cause:** Clerk API returned empty token data
**Fix:**
- Check Clerk Dashboard → SSO Connections → Google
- Verify Gmail API scopes are configured
- User may need to reconnect their Google account

#### Error: "OAuth access token is empty"
**Location:** `lib/gmail/credentials.ts:65`
**Cause:** Token data exists but is empty
**Fix:** Check Clerk configuration and Google Cloud Console setup

#### Tool Execution Errors
**Location:** `app/api/chat/agents/route.ts` (Tool call events)
**Look for:** `[Agent Route xxx] Tool call failed:`
**Cause:** Gmail API returned an error or invalid input
**Fix:** Check the tool input and Gmail API error message in logs

### Step 4: Trace a Request End-to-End

Find the request ID in your logs and follow the execution:

```
[Agent Route abc123] ===== New chat request =====
  ↓
[Gmail Credentials] Initializing token function for user: user_xyz
  ↓
[Gmail Credentials] Token function called (call #1) for user: user_xyz
  ↓
[Gmail Credentials] Successfully retrieved access token (145ms)
  ↓
[Gmail Tools] Creating Gmail tools with access token function
  ↓
[Gmail Tools] Successfully created all 5 Gmail tools
  ↓
[Agent Route abc123] All tools assembled
  ↓
[Agent Route abc123] Tool call #1 started: { tool: 'gmail_search', input: '...' }
  ↓
[Gmail Tools] Access token requested by LangChain tool
  ↓
[Gmail Credentials] Token function called (call #2) for user: user_xyz
  ↓
[Gmail Credentials] Successfully retrieved access token (132ms)
  ↓
[Gmail Tools] Access token successfully provided to tool
  ↓
[Agent Route abc123] Tool call completed
  ↓
[Agent Route abc123] Stream completed. Total tool calls: 3
```

## Log Output Locations

- **Server Console:** All `console.log` and `console.error` calls appear in your terminal running `npm run dev`
- **Browser Console:** Frontend errors from `ChatWindow.tsx` appear in browser DevTools
- **User Interface:** Error toasts shown to users with friendly messages

## Performance Monitoring

The logs include timing information:
- Token retrieval duration: `(145ms)`
- Agent execution duration: `(${duration}ms)`
- Tool call counter: `call #N`

Use this to identify performance bottlenecks.

## Troubleshooting Tips

1. **Token refreshing too often?**
   - Check the call counter in `[Gmail Credentials] Token function called (call #N)`
   - Each tool call requests a fresh token, which is expected
   - If count is excessive, there may be retry loops

2. **Tools not being called?**
   - Look for `[Agent Route xxx] Tool call #N started`
   - If missing, the agent may not be triggering tools
   - Check the agent prompt and user message

3. **Silent failures?**
   - Check for `[Agent Route] Fatal error:` at the end
   - Look for stack traces in error logs
   - Check both server and browser console

4. **User seeing generic error?**
   - Check server logs for detailed error
   - The frontend shows user-friendly messages
   - Full details are in `[Agent Route] Fatal error:` log

## Next Steps

With this logging in place, you can:
1. ✅ See exactly where Gmail tool execution fails
2. ✅ Track OAuth token lifecycle
3. ✅ Monitor tool call inputs and outputs
4. ✅ Measure performance of each component
5. ✅ Provide better error messages to users

Run your application with `npm run dev` and test Gmail tool functionality. Watch the terminal for the detailed logs!
