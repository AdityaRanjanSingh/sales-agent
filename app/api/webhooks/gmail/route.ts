import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  processNewEmails,
  getUserIdFromEmail,
} from "@/lib/gmail/process-emails";
import { getGmailAccessTokenFunctionForUser } from "@/lib/gmail/credentials";

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
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log(`[Gmail Webhook ${requestId}] Received POST request`);

    // Verify the webhook is from Google
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    // Optional: Verify with a secret token if you configured one
    const webhookToken = process.env.GMAIL_WEBHOOK_TOKEN;
    if (webhookToken) {
      const providedToken = authHeader?.replace("Bearer ", "");
      if (providedToken !== webhookToken) {
        console.warn(
          `[Gmail Webhook ${requestId}] Unauthorized request - invalid token`,
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(`[Gmail Webhook ${requestId}] Token verification passed`);
    } else {
      console.log(
        `[Gmail Webhook ${requestId}] No webhook token configured - skipping auth check`,
      );
    }

    // Parse the push notification
    const notification: GmailPushNotification = await req.json();

    // Decode the base64 data
    let notificationData: GmailNotificationData;
    try {
      const decodedData = Buffer.from(
        notification.message.data,
        "base64",
      ).toString("utf-8");

      notificationData = JSON.parse(decodedData);
      console.log(`[Gmail Webhook ${requestId}] Decoded notification data:`, {
        emailAddress: notificationData.emailAddress,
        historyId: notificationData.historyId,
        messageId: notification.message.messageId,
        publishTime: notification.message.publishTime,
      });
    } catch (error) {
      console.error(
        `[Gmail Webhook ${requestId}] Failed to decode notification data:`,
        {
          error: error instanceof Error ? error.message : String(error),
          rawData: notification.message.data,
        },
      );
      throw new Error("Failed to decode notification data");
    }

    // Get the user ID from the email address
    const userId = await getUserIdFromEmail(notificationData.emailAddress);

    if (!userId) {
      console.warn(
        `[Gmail Webhook ${requestId}] No user found for email ${notificationData.emailAddress}`,
      );
      return NextResponse.json(
        {
          success: false,
          message: "User not found for email address",
          emailAddress: notificationData.emailAddress,
          requestId,
        },
        { status: 200 }, // Return 200 to prevent Google retries
      );
    }

    console.log(
      `[Gmail Webhook ${requestId}] Found user ${userId} for email ${notificationData.emailAddress}`,
    );

    // Get the Gmail access token function for this specific user
    // This works in webhook context without requiring auth() session
    let getAccessToken;
    try {
      getAccessToken = await getGmailAccessTokenFunctionForUser(userId);
      console.log(
        `[Gmail Webhook ${requestId}] Successfully obtained access token function for user ${userId}`,
      );
    } catch (error) {
      console.error(
        `[Gmail Webhook ${requestId}] Failed to get access token function:`,
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
      );
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get access token for user",
          emailAddress: notificationData.emailAddress,
          requestId,
        },
        { status: 200 }, // Return 200 to prevent Google retries
      );
    }

    // Process the emails in the background
    // Using Promise without await to respond quickly to Google
    console.log(
      `[Gmail Webhook ${requestId}] Starting background email processing for ${notificationData.emailAddress}`,
    );

    processNewEmails(
      {
        emailAddress: notificationData.emailAddress,
        historyId: notificationData.historyId,
        userId,
      },
      getAccessToken,
    )
      .then((result) => {
        console.log(
          `[Gmail Webhook ${requestId}] Email processing completed for ${notificationData.emailAddress}:`,
          result,
        );
      })
      .catch((error) => {
        console.error(
          `[Gmail Webhook ${requestId}] Email processing failed for ${notificationData.emailAddress}:`,
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
      });

    // Acknowledge receipt immediately to Google
    console.log(
      `[Gmail Webhook ${requestId}] Acknowledging notification receipt to Google`,
    );
    return NextResponse.json(
      {
        success: true,
        message: "Notification received and processing started",
        emailAddress: notificationData.emailAddress,
        historyId: notificationData.historyId,
        userId,
        requestId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      `[Gmail Webhook ${requestId}] Error processing Gmail webhook:`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );

    // Return 200 even on error to prevent Google from retrying
    // Log the error for debugging but acknowledge receipt
    return NextResponse.json(
      {
        success: false,
        error: "Error processing notification",
        details: error instanceof Error ? error.message : String(error),
        requestId,
      },
      { status: 200 },
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
    { status: 200 },
  );
}
