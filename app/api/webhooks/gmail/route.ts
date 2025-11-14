import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Gmail Webhook Handler for Push Notifications
 *
 * This endpoint receives notifications from Gmail when new emails arrive.
 * To set up Gmail push notifications:
 *
 * 1. Create a Google Cloud Pub/Sub topic
 * 2. Grant Gmail API permission to publish to the topic
 * 3. Create a push subscription pointing to this webhook
 * 4. Use Gmail API's watch() method to start receiving notifications
 *
 * See: https://developers.google.com/gmail/api/guides/push
 */

interface GmailPushNotification {
  message: {
    // Base64 encoded data
    data: string;
    messageId: string;
    message_id: string;
    publishTime: string;
    publish_time: string;
  };
  subscription: string;
}

interface GmailNotificationData {
  emailAddress: string;
  historyId: number;
}

export async function POST(req: NextRequest) {
  try {
    // Verify the webhook is from Google
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    // Optional: Verify with a secret token if you configured one
    const webhookToken = process.env.GMAIL_WEBHOOK_TOKEN;
    if (webhookToken) {
      const providedToken = authHeader?.replace("Bearer ", "");
      if (providedToken !== webhookToken) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Parse the push notification
    const notification: GmailPushNotification = await req.json();

    // Decode the base64 data
    const decodedData = Buffer.from(
      notification.message.data,
      "base64"
    ).toString("utf-8");

    const notificationData: GmailNotificationData = JSON.parse(decodedData);

    // TODO: Implement your email processing logic here
    // Options:
    // 1. Trigger the sales assistant agent to check for new brochure requests
    // 2. Queue a background job to process the email
    // 3. Store the notification in a database for later processing

    // Example: You could make an internal API call to your agent
    // const agentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat/agents`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     messages: [{
    //       role: 'user',
    //       content: 'Check for new brochure requests in my email'
    //     }]
    //   })
    // });

    // For now, just log and acknowledge receipt
    return NextResponse.json(
      {
        success: true,
        message: "Notification received and processed",
        emailAddress: notificationData.emailAddress,
        historyId: notificationData.historyId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing Gmail webhook:", error);

    // Return 200 even on error to prevent Google from retrying
    // Log the error for debugging but acknowledge receipt
    return NextResponse.json(
      {
        success: false,
        error: "Error processing notification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }
    );
  }
}

/**
 * Gmail sends a GET request to verify the webhook endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      message: "Gmail webhook endpoint is active",
      status: "ready",
    },
    { status: 200 }
  );
}
