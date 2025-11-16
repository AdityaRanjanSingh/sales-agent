import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { getGmailAccessTokenFunction } from "@/lib/gmail/credentials";
import { createAllActions } from "./tools";
import { SALES_ASSISTANT_INSTRUCTIONS } from "./config/instructions";

export const runtime = "nodejs";

/**
 * CopilotKit runtime endpoint that handles all copilot interactions
 * Integrates Gmail tools and brochure retriever with user's OAuth credentials
 */
export async function POST(req: NextRequest) {
  try {
    // Get Gmail access token function for the authenticated user
    let getAccessToken: () => Promise<string>;
    try {
      getAccessToken = await getGmailAccessTokenFunction();
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

    // Create all CopilotKit actions
    const actions = createAllActions(getAccessToken);

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
