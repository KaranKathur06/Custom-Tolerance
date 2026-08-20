export type RfqDraftState = {
  id: string;
  status: "draft";
  title: string;
  slug: string;
  composerStep: number;
  createdAt: string;
  updatedAt: string;
  canResume: boolean;
  canPublish: boolean;
};

export type RfqDraftRequest = {
  rfqId: string;
  userId: string;
  isAdmin?: boolean;
};

/**
 * Determine if a draft can be resumed for editing.
 * Drafts can always be resumed unless explicitly archived.
 */
export function canResumeDraft(draft: { status: string; deletedAt?: string | null }): boolean {
  if (draft.status !== "draft") return false;
  if (draft.deletedAt) return false;
  return true;
}

/**
 * Determine if a draft can be published.
 * A draft needs at least basic information to be publishable.
 */
export function canPublishDraft(draft: {
  status: string;
  title?: string | null;
  composerStep?: number | null;
  deletedAt?: string | null;
}): boolean {
  if (draft.status !== "draft") return false;
  if (draft.deletedAt) return false;
  if (!draft.title?.trim()) return false;
  // Require at least reaching step 3 or beyond (basic form completion)
  if ((draft.composerStep ?? 0) < 3) return false;
  return true;
}

/**
 * Normalize a draft RFQ record into a canonical state.
 */
export function normalizeDraftState(input: {
  id: string;
  status: string;
  title?: string | null;
  slug?: string | null;
  composer_step?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}): RfqDraftState | null {
  if (input.status !== "draft") return null;
  if (input.deleted_at) return null;

  return {
    id: input.id,
    status: "draft",
    title: input.title || "Untitled RFQ",
    slug: input.slug || "",
    composerStep: input.composer_step ?? 0,
    createdAt: input.created_at || new Date().toISOString(),
    updatedAt: input.updated_at || new Date().toISOString(),
    canResume: canResumeDraft(input),
    canPublish: canPublishDraft(input),
  };
}

/**
 * Get all draft states for a buyer.
 * Useful for dashboard and draft listing views.
 */
export function filterDrafts(
  rfqs: Array<{ id: string; status: string; [key: string]: any }>,
): RfqDraftState[] {
  return rfqs
    .map((rfq) => normalizeDraftState(rfq))
    .filter((draft): draft is RfqDraftState => draft !== null);
}

/**
 * Compose the resume URL for a draft.
 * The composer should accept a draft ID and load it automatically.
 */
export function getResumeUrl(draftId: string): string {
  return `/rfq/new?draft=${draftId}`;
}
