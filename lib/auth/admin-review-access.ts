export const ADMIN_REVIEW_ACCESS_MARKER = "claude_admin_review_v1";
export const ADMIN_REVIEW_ACCESS_MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

export type AdminReviewAccessReason =
  | "active"
  | "not_reviewer"
  | "disabled"
  | "misconfigured"
  | "expired"
  | "window_too_long"
  | "identity_mismatch";

export type AdminReviewAccessConfiguration = {
  active: boolean;
  reason: Exclude<AdminReviewAccessReason, "not_reviewer" | "identity_mismatch">;
  email: string;
  keyHash: string;
  expiresAt: Date | null;
};

type ReviewUserLike = {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function getAdminReviewAccessConfiguration(
  nowMs: number = Date.now(),
): AdminReviewAccessConfiguration {
  const enabled = process.env.ADMIN_REVIEW_ACCESS_ENABLED === "true";
  const email = normalizeEmail(process.env.ADMIN_REVIEWER_EMAIL);
  const keyHash = (process.env.ADMIN_REVIEW_ACCESS_KEY_HASH ?? "").trim().toLowerCase();
  const rawExpiry = (process.env.ADMIN_REVIEW_ACCESS_EXPIRES_AT ?? "").trim();
  const expiresAtMs = Date.parse(rawExpiry);
  const expiresAt = Number.isFinite(expiresAtMs) ? new Date(expiresAtMs) : null;

  if (!enabled) {
    return { active: false, reason: "disabled", email, keyHash, expiresAt };
  }

  if (!email || !email.includes("@") || !/^[a-f0-9]{64}$/.test(keyHash) || !expiresAt) {
    return { active: false, reason: "misconfigured", email, keyHash, expiresAt };
  }

  if (expiresAtMs <= nowMs) {
    return { active: false, reason: "expired", email, keyHash, expiresAt };
  }

  if (expiresAtMs - nowMs > ADMIN_REVIEW_ACCESS_MAX_WINDOW_MS) {
    return { active: false, reason: "window_too_long", email, keyHash, expiresAt };
  }

  return { active: true, reason: "active", email, keyHash, expiresAt };
}

export function isAdminReviewUser(user: ReviewUserLike | null | undefined): boolean {
  return user?.app_metadata?.review_access === ADMIN_REVIEW_ACCESS_MARKER;
}

export function evaluateAdminReviewAccess(
  user: ReviewUserLike | null | undefined,
  nowMs: number = Date.now(),
): { isReviewer: boolean; active: boolean; reason: AdminReviewAccessReason; expiresAt: Date | null } {
  if (!isAdminReviewUser(user)) {
    return { isReviewer: false, active: false, reason: "not_reviewer", expiresAt: null };
  }

  const configuration = getAdminReviewAccessConfiguration(nowMs);
  if (!configuration.active) {
    return {
      isReviewer: true,
      active: false,
      reason: configuration.reason,
      expiresAt: configuration.expiresAt,
    };
  }

  const role = user?.app_metadata?.role;
  if (normalizeEmail(user?.email) !== configuration.email || role !== "super_admin") {
    return {
      isReviewer: true,
      active: false,
      reason: "identity_mismatch",
      expiresAt: configuration.expiresAt,
    };
  }

  return {
    isReviewer: true,
    active: true,
    reason: "active",
    expiresAt: configuration.expiresAt,
  };
}

