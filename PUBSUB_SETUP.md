# Google Pub/Sub Setup for Gmail Push Notifications

This guide explains how to configure Google Cloud Pub/Sub to send Gmail push notifications to your webhook endpoint.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Gmail API enabled
3. Cloud Pub/Sub API enabled
4. Your application deployed and accessible via HTTPS

## Setup Steps

### 1. Create a Pub/Sub Topic

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create the topic
gcloud pubsub topics create gmail-notifications --project=$PROJECT_ID
```

### 2. Grant Gmail API Permission to Publish

The Gmail API uses a service account to publish messages to your Pub/Sub topic. You need to grant it permission:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member='serviceAccount:gmail-api-push@system.gserviceaccount.com' \
  --role='roles/pubsub.publisher' \
  --project=$PROJECT_ID
```

### 3. Create a Push Subscription

Create a subscription that pushes messages to your webhook endpoint:

```bash
# Set your app URL
export APP_URL="https://your-app-url.vercel.app"

# Optional: Generate a secure webhook token
export WEBHOOK_TOKEN=$(openssl rand -base64 32)

# Create push subscription
gcloud pubsub subscriptions create gmail-webhook-subscription \
  --topic=gmail-notifications \
  --push-endpoint=$APP_URL/api/webhooks/gmail \
  --project=$PROJECT_ID
```

### 4. Configure Environment Variables

Add these to your `.env.local` (for local development) and deployment environment:

```bash
# Required: Secure token to verify webhook requests
GMAIL_WEBHOOK_TOKEN="your-secure-random-token-here"

# Optional: For programmatic Pub/Sub management
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
PUBSUB_TOPIC_NAME="gmail-notifications"
PUBSUB_SUBSCRIPTION_NAME="gmail-webhook-subscription"

# Optional: Application URL
NEXT_PUBLIC_APP_URL="https://your-app-url.vercel.app"
```

### 5. Set Up Gmail Watch (Per User)

You need to call the Gmail API's `watch()` method for each user who wants to receive notifications. This is NOT yet implemented in the code, but here's what needs to be done:

**Option A: Manual Setup via API**

You can use the Gmail API Explorer or make a direct API call:

```bash
# Get user's OAuth access token (from Clerk or directly)
export ACCESS_TOKEN="user-oauth-access-token"

# Call the watch API
curl https://gmail.googleapis.com/gmail/v1/users/me/watch \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "projects/'$PROJECT_ID'/topics/gmail-notifications",
    "labelIds": ["INBOX"]
  }'
```

**Option B: Future Implementation**

The application should implement an endpoint like `/api/gmail/watch/setup` that:
1. Gets the user's OAuth token from Clerk
2. Calls `gmail.users.watch()` with the Pub/Sub topic
3. Stores the watch expiration time (watches expire after 7 days max)
4. Sets up automatic refresh via a cron job

## How It Works

1. **User sends/receives email** → Gmail detects change
2. **Gmail publishes to Pub/Sub** → Message sent to `gmail-notifications` topic
3. **Pub/Sub pushes to webhook** → POST request to `/api/webhooks/gmail`
4. **Webhook processes notification** → Extracts email address and history ID
5. **Webhook triggers agent** → Sales assistant checks for brochure requests
6. **Agent processes emails** → Searches, reads, and responds to brochure requests

## Notification Format

The Pub/Sub message contains base64-encoded data with this structure:

```json
{
  "emailAddress": "user@example.com",
  "historyId": 1234567
}
```

## Testing

### Test Webhook Endpoint

```bash
# Test that webhook is reachable
curl https://your-app-url.vercel.app/api/webhooks/gmail

# Expected response:
# {"message":"Gmail webhook endpoint is active","status":"ready"}
```

### Send Test Notification

You can test the full flow by sending yourself an email that mentions "brochure" after setting up the watch.

### View Logs

Check your application logs (Vercel logs or local console) for detailed information about webhook processing:

```
[Gmail Webhook abc123] Received POST request
[Gmail Webhook abc123] Decoded notification data: {...}
[Gmail Webhook abc123] Found user xyz789 for email user@example.com
[Gmail Webhook abc123] Starting background email processing
[Gmail Webhook abc123] Email processing completed: {...}
```

## Troubleshooting

### Webhook not receiving notifications

1. **Check watch status**: Gmail watches expire after 7 days max. You need to call `watch()` again.
2. **Verify Pub/Sub subscription**: Check that the subscription is active and pointing to the correct endpoint
3. **Check webhook token**: Ensure `GMAIL_WEBHOOK_TOKEN` matches between Pub/Sub and your app
4. **Verify endpoint is HTTPS**: Pub/Sub only pushes to HTTPS endpoints

### User not found error

The webhook looks up users by email address in Clerk. Ensure:
- User is signed in with the same Google account that's receiving emails
- User's email is verified in Clerk

### Access token errors

- Ensure user has connected their Gmail account via Clerk OAuth
- Check that OAuth scopes include Gmail API access
- Verify Clerk OAuth configuration includes Google provider

## Security Notes

1. **Always use GMAIL_WEBHOOK_TOKEN**: This prevents unauthorized requests to your webhook
2. **HTTPS only**: Never use HTTP for webhook endpoints
3. **Return 200 on errors**: The webhook returns 200 even on errors to prevent Google from retrying
4. **Validate message source**: The webhook validates the authorization header
5. **Background processing**: Email processing happens asynchronously to respond quickly to Google

## Watch Expiration

Gmail watches expire after a maximum of 7 days. Best practices:

1. Store the expiration time when calling `watch()`
2. Set up a daily cron job to refresh expiring watches
3. Re-call `watch()` at least every 6 days
4. Handle errors gracefully if watch expires

## Cost Considerations

- **Pub/Sub pricing**: You pay for message delivery (~$40 per million messages)
- **API calls**: Gmail API has quotas (check Google Cloud Console)
- **Watch calls**: Free but rate-limited (1 per user per day recommended)

## References

- [Gmail Push Notifications Guide](https://developers.google.com/gmail/api/guides/push)
- [Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Gmail API Watch Reference](https://developers.google.com/gmail/api/reference/rest/v1/users/watch)
