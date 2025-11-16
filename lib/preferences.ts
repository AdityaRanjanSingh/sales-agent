import { prisma } from "@/lib/prisma";

/**
 * Helper to fetch and normalize a user's saved custom instructions.
 */
export async function getUserCustomInstructions(
  userId: string | null | undefined
): Promise<string | undefined> {
  if (!userId) {
    return undefined;
  }

  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    return preferences?.customInstructions?.trim() || undefined;
  } catch (error) {
    console.error("[Preferences] Failed to load user instructions:", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
