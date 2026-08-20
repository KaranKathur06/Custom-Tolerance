export type RfqPublishState = {
  id: string;
  status: "open";
  title: string;
  slug: string;
  publishedAt: string;
  buyerProfileId: string;
  visibility: "standard" | "premium";
};

export type RfqPublishRequest = {
  rfqId: string;
  buyerProfileId: string;
  buyerUserId: string;
  isAdmin?: boolean;
};

export type RfqPublishError =
  | "RFQ_NOT_FOUND"
  | "INVALID_STATUS"
  | "INSUFFICIENT_DATA"
  | "UNAUTHORIZED"
  | "ALREADY_PUBLISHED";

/**
 * Determine if an RFQ can be published.
 * Only drafts with minimum required data can be published.
 */
export function canPublishRfq(rfq: {
  id: string;
  status: string;
  title?: string | null;
  description?: string | null;
  composer_step?: number | null;
  deletedAt?: string | null;
}): { allowed: boolean; error?: RfqPublishError } {
  if (rfq.deletedAt) {
    return { allowed: false, error: "RFQ_NOT_FOUND" };
  }

  if (rfq.status !== "draft") {
    return { allowed: false, error: "INVALID_STATUS" };
  }

  if (!rfq.title?.trim()) {
    return { allowed: false, error: "INSUFFICIENT_DATA" };
  }

  // Require at least step 3 (basic form completion)
  if ((rfq.composer_step ?? 0) < 3) {
    return { allowed: false, error: "INSUFFICIENT_DATA" };
  }

  return { allowed: true };
}

/**
 * Normalize a published RFQ record into a canonical state.
 */
export function normalizePublishedState(input: {
  id: string;
  status: string;
  title?: string | null;
  slug?: string | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  visibility_level?: string | null;
  buyer_profile_id?: string | null;
}): RfqPublishState | null {
  if (input.status !== "open" && input.status !== "quoted" && input.status !== "closed") {
    return null;
  }

  const visibilityLevel = input.visibility_level as "standard" | "premium" | undefined;

  return {
    id: input.id,
    status: "open",
    title: input.title || "Untitled RFQ",
    slug: input.slug || "",
    publishedAt: input.published_at || input.updated_at || new Date().toISOString(),
    buyerProfileId: input.buyer_profile_id || "",
    visibility: visibilityLevel === "premium" ? "premium" : "standard",
  };
}

/**
 * Validate that a publish transition is allowed.
 * Enforces the state machine contract: draft → open (only).
 */
export function validatePublishTransition(
  currentStatus: string,
  newStatus: string = "open",
): { valid: boolean; error?: string } {
  const allowedTransitions: Record<string, string[]> = {
    draft: ["open"],
    open: [],
    quoted: [],
    closed: [],
    cancelled: [],
    in_review: ["open"],
  };

  const allowed = allowedTransitions[currentStatus]?.includes(newStatus);

  if (!allowed) {
    return {
      valid: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}"`,
    };
  }

  return { valid: true };
}

/**
 * Compose the published RFQ URL.
 */
export function getPublishedUrl(slug: string): string {
  return `/rfq/${slug}`;
}
