import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGmailAccessTokenFunctionForUser } from "@/lib/gmail/credentials";
import { getDriveAccessTokenFunctionForUser } from "@/lib/drive/credentials";
import { getUserCustomInstructions } from "@/lib/preferences";
import { createAllActions } from "./tools";

export const runtime = "nodejs";

/**
 * CopilotKit runtime endpoint that handles all copilot interactions
 * Integrates Gmail tools and brochure retriever with user's OAuth credentials
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Gmail access token function for the authenticated user
    let getGmailAccessToken: () => Promise<string>;
    try {
      getGmailAccessToken = await getGmailAccessTokenFunctionForUser(userId);
    } catch (error) {
      console.error("[CopilotKit] Failed to get Gmail access token:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return error response
      return new Response(
        JSON.stringify({
          error:
            "Gmail not connected. Please connect your Gmail account to use the sales assistant.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Drive access token function for the authenticated user
    let getDriveAccessToken: () => Promise<string>;
    try {
      getDriveAccessToken = await getDriveAccessTokenFunctionForUser(userId);
    } catch (error) {
      console.error("[CopilotKit] Failed to get Drive access token:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Note: We don't return error here since Drive is optional
      // Set to a function that throws when called
      getDriveAccessToken = async () => {
        throw new Error(
          "Google Drive not connected. Please connect your Google account to use Drive features."
        );
      };
    }

    // Load the user's custom instructions so draft generation can respect them
    const customInstructions = await getUserCustomInstructions(userId);

    // Create all CopilotKit actions
    const actions = createAllActions(getGmailAccessToken, getDriveAccessToken, {
      customInstructions,
    });

    // Create CopilotKit runtime with OpenAI adapter
    const copilotKit = new CopilotRuntime({
      actions,
    });

    const serviceAdapter = new OpenAIAdapter({
      model: "gpt-4o-mini",
    });

    const handler = copilotRuntimeNextJSAppRouterEndpoint({
      runtime: copilotKit,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handler.POST(req);
  } catch (error) {
    console.error("[CopilotKit] Fatal error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
