/**
 * In-memory state management for pending email reply drafts
 * Stores draft previews awaiting user confirmation before creating in Gmail
 */

export interface PendingReplyDraft {
  confirmationId: string;
  threadId: string;
  to: string[];
  subject: string;
  draftContent: string;
  threadContext: string;
  headers: {
    inReplyTo?: string;
    references?: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

// In-memory store for pending drafts
// In production, consider Redis or database for multi-instance support
const pendingDrafts = new Map<string, PendingReplyDraft>();

// Cleanup expired drafts every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DRAFT_TTL = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = new Date();
  for (const [id, draft] of pendingDrafts.entries()) {
    if (draft.expiresAt < now) {
      pendingDrafts.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generate a unique confirmation ID
 */
function generateConfirmationId(): string {
  return `reply_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Store a pending draft awaiting confirmation
 */
export function storePendingDraft(
  draft: Omit<PendingReplyDraft, "confirmationId" | "createdAt" | "expiresAt">
): string {
  const confirmationId = generateConfirmationId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAFT_TTL);

  pendingDrafts.set(confirmationId, {
    ...draft,
    confirmationId,
    createdAt: now,
    expiresAt,
  });

  return confirmationId;
}

/**
 * Retrieve a pending draft by confirmation ID
 */
export function getPendingDraft(
  confirmationId: string
): PendingReplyDraft | undefined {
  const draft = pendingDrafts.get(confirmationId);

  // Check if expired
  if (draft && draft.expiresAt < new Date()) {
    pendingDrafts.delete(confirmationId);
    return undefined;
  }

  return draft;
}

/**
 * Remove a pending draft after it's been confirmed/rejected
 */
export function removePendingDraft(confirmationId: string): boolean {
  return pendingDrafts.delete(confirmationId);
}

/**
 * Get all pending drafts (for debugging/admin)
 */
export function getAllPendingDrafts(): PendingReplyDraft[] {
  return Array.from(pendingDrafts.values());
}

/**
 * Clear all pending drafts (for testing)
 */
export function clearAllPendingDrafts(): void {
  pendingDrafts.clear();
}
