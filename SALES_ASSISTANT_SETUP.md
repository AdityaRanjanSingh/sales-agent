# Sales Assistant Setup Guide

## Overview
The sales assistant agent monitors Gmail for brochure requests and automatically drafts responses with appropriate brochure attachments.

## Architecture

### Components Created
1. **Agent Route** (`/app/api/chat/agents/route.ts`)
   - LangGraph ReAct agent with Gmail tools
   - Professional sales assistant persona
   - Automatic brochure request handling

2. **Brochure Tool** (`/lib/tools/brochure.ts`)
   - Retrieves brochures from Supabase Storage
   - Searches by name/keyword
   - Returns public URLs for email attachments

3. **Gmail Credentials** (`/lib/gmail/credentials.ts`)
   - Extracts OAuth tokens from Clerk user metadata
   - Provides credentials to Gmail tools

4. **Webhook Endpoint** (`/app/api/webhooks/gmail/route.ts`)
   - Receives Gmail push notifications
   - Processes new email events
   - Ready for background job integration

## Setup Steps

### 1. Configure Gmail OAuth in Clerk

The sales assistant uses Clerk's built-in OAuth system to access Gmail.

**Setup Steps:**

1. **Enable Google OAuth in Clerk Dashboard:**
   - Go to Clerk Dashboard → Configure → SSO Connections
   - Enable "Google" as an OAuth provider
   - Add the Gmail API scopes you need:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.compose`

2. **Configure Google Cloud Console:**
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Add authorized redirect URIs from Clerk
   - Enable Gmail API for your project

3. **Create a JWT Template in Clerk (Important!):**
   - Go to Clerk Dashboard → Configure → JWT Templates
   - Create a new template named `oauth_google`
   - Add Google OAuth token to the claims
   - This allows `getToken({ template: "oauth_google" })` to work

4. **Users Connect Gmail:**
   - Users sign in with Google OAuth through Clerk
   - Clerk automatically manages token refresh
   - No manual token storage needed!

**How it works:**
The `getGmailAccessTokenFunction()` uses Clerk's `getToken()` method which:
- Automatically retrieves the OAuth token for the authenticated user
- Handles token refresh transparently
- No need to manually store/update tokens in metadata

### 2. Setup Supabase Storage

Create a bucket for brochures:

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `brochures`
3. Set bucket to **public** or configure appropriate RLS policies
4. Upload your brochure files (PDF, DOCX, etc.)

**Brochure naming convention:**
- Use descriptive names: `product-catalog.pdf`, `pricing-2024.pdf`
- The agent searches by keyword, so clear names help

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
# Supabase (should already exist)
SUPABASE_URL=your_supabase_url
SUPABASE_PRIVATE_KEY=your_supabase_key

# Gmail Webhook (optional)
GMAIL_WEBHOOK_TOKEN=your_secret_token_for_webhook_verification

# OpenAI (should already exist)
OPENAI_API_KEY=your_openai_key
```

### 4. Setup Gmail Push Notifications (Optional)

For real-time email monitoring:

#### A. Create Google Cloud Pub/Sub Topic

```bash
# Install gcloud CLI if needed
# Create a topic
gcloud pubsub topics create gmail-notifications

# Grant Gmail permission to publish
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

#### B. Create Push Subscription

```bash
gcloud pubsub subscriptions create gmail-push-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://your-domain.com/api/webhooks/gmail \
  --push-auth-service-account=your-service-account@project.iam.gserviceaccount.com
```

#### C. Start Gmail Watch

Use the Gmail API to start watching the mailbox:

```typescript
import { google } from 'googleapis';

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/YOUR_PROJECT_ID/topics/gmail-notifications',
    labelIds: ['INBOX'],
  },
});
```

**Note:** Gmail watch expires after 7 days and must be renewed.

## Usage

### Basic Usage

Users can interact with the sales assistant through the chat interface:

```
User: "Check my email for any brochure requests"

Agent:
1. Searches Gmail for unread emails with "brochure" keyword
2. Reads each email to understand the request
3. Retrieves appropriate brochure from Supabase
4. Drafts a professional response with the brochure attached
5. Either sends the email or presents the draft for review
```

### Agent Workflow

The agent follows this automatic workflow:

```
Incoming Email → Agent Detects Keywords → Analyzes Request
→ Retrieves Brochure → Drafts Response → Attaches File → Sends Email
```

### Example Interactions

**Example 1: Check for brochure requests**
```
User: "Check for new brochure requests"

Agent uses tools:
1. gmail_search("is:unread brochure OR catalog OR product information")
2. gmail_get_message(messageId) - for each result
3. retrieve_brochure("product-catalog") - based on email content
4. gmail_send_message(to, subject, body, attachmentUrl)

Response: "Found 2 brochure requests. Sent product catalog to john@example.com
and pricing information to sarah@company.com"
```

**Example 2: Manual draft creation**
```
User: "Draft a response to the email from john@example.com with our latest catalog"

Agent uses tools:
1. gmail_search("from:john@example.com")
2. gmail_get_message(messageId)
3. retrieve_brochure("catalog")
4. gmail_create_draft(to, subject, body, attachmentUrl)

Response: "Created draft email to john@example.com with latest-catalog.pdf attached"
```

## Available Tools

The agent has access to these tools:

### Gmail Tools (from @langchain/community)

1. **gmail_search**
   - Search emails by query
   - Example: `is:unread brochure`

2. **gmail_get_message**
   - Get full email content
   - Input: message ID

3. **gmail_get_thread**
   - Get entire email thread
   - Input: thread ID

4. **gmail_create_draft**
   - Create email draft with attachments
   - Supports file URLs

5. **gmail_send_message**
   - Send email directly
   - Supports attachments

### Custom Tools

6. **retrieve_brochure**
   - Search Supabase Storage for brochures
   - Returns public URL for attachment
   - Input: brochure name/keyword

## Agent System Prompt

The agent is configured as a professional sales assistant with these guidelines:

- Professional and courteous communication
- Automatic brochure request detection
- Personalized responses based on customer needs
- Verification before sending
- Professional email signatures
- Fallback to alternatives if brochure unavailable

## Troubleshooting

### "Gmail not connected" Error

**Cause:** Gmail OAuth not configured in Clerk or user hasn't connected Gmail

**Solution:**
1. Verify Google OAuth is enabled in Clerk Dashboard
2. Check JWT template `oauth_google` is configured
3. Ensure user signed in with Google OAuth
4. Verify Gmail API scopes are included in OAuth configuration
5. Check that Gmail API is enabled in Google Cloud Console

### "Brochure not found" Error

**Cause:** Requested brochure doesn't exist in Supabase Storage

**Solution:**
1. Check Supabase Storage bucket `brochures` exists
2. Verify brochure files are uploaded
3. Use descriptive filenames that match common search terms
4. The tool returns available brochures when search fails

### Webhook Not Receiving Notifications

**Cause:** Gmail watch not configured or expired

**Solution:**
1. Verify Pub/Sub topic and subscription exist
2. Check webhook URL is publicly accessible (use ngrok for local dev)
3. Renew Gmail watch (expires every 7 days)
4. Check Cloud Pub/Sub logs for delivery failures

### Gmail API Rate Limits

**Cause:** Too many API calls

**Solution:**
1. Implement caching for frequently accessed emails
2. Use batch requests where possible
3. Monitor quota usage in Google Cloud Console
4. Consider upgrading quotas if needed

## Development

### Local Testing

For local development with webhooks:

1. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Update Pub/Sub subscription with ngrok URL:
   ```bash
   gcloud pubsub subscriptions update gmail-push-sub \
     --push-endpoint=https://your-ngrok-url.ngrok.io/api/webhooks/gmail
   ```

3. Test the webhook:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/gmail \
     -H "Content-Type: application/json" \
     -d '{"message":{"data":"base64_encoded_data"}}'
   ```

### Testing the Agent

```typescript
// Test via API
const response = await fetch('/api/chat/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: 'Check for brochure requests in my inbox'
      }
    ]
  })
});
```

## Security Considerations

1. **OAuth Tokens**
   - Stored in Clerk metadata (secure)
   - Never exposed to client-side code
   - Refresh tokens allow long-term access

2. **Webhook Verification**
   - Use `GMAIL_WEBHOOK_TOKEN` to verify authenticity
   - Always validate incoming webhook payloads
   - Return 200 even on errors to prevent retries

3. **Supabase Storage**
   - Use RLS policies to control access
   - Consider private buckets with signed URLs
   - Validate file types before upload

4. **Rate Limiting**
   - Implement rate limiting on webhook endpoint
   - Monitor for unusual activity
   - Use Cloud Armor or similar DDoS protection

## Next Steps

1. **Implement OAuth Flow**
   - Create UI for users to connect Gmail
   - Handle OAuth callback
   - Store credentials in Clerk metadata

2. **Background Job Processing**
   - Use Inngest, Trigger.dev, or similar
   - Process emails asynchronously
   - Implement retry logic

3. **Enhanced Brochure Management**
   - Admin UI to upload/manage brochures
   - Version control for brochures
   - Analytics on brochure requests

4. **Email Templates**
   - Create customizable email templates
   - Support for multiple languages
   - Personalization variables

5. **Monitoring & Analytics**
   - Track email response rates
   - Monitor agent performance
   - Alert on errors or failures

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Gmail API docs: https://developers.google.com/gmail/api
3. Review LangChain docs: https://js.langchain.com/docs/integrations/tools/gmail

## Files Modified/Created

- `/app/api/chat/agents/route.ts` - Sales assistant agent
- `/lib/tools/brochure.ts` - Brochure retrieval tool
- `/lib/gmail/credentials.ts` - Gmail OAuth helper
- `/app/api/webhooks/gmail/route.ts` - Webhook handler
- `/SALES_ASSISTANT_SETUP.md` - This setup guide