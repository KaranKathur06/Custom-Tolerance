/**
 * Email OTP verification security layer.
 * Supabase Auth generates and validates OTP tokens — this module tracks
 * application-level rate limits, attempt counts, and audit events.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const OTP_CONFIG = {
  /** Must match Supabase Dashboard → Auth → Email → OTP length (default 6) */
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  LOCKOUT_MINUTES: 15,
} as const;

export function normalizeOtpToken(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, OTP_CONFIG.LENGTH);
}

export function isValidOtpToken(token: string): boolean {
  return token.length === OTP_CONFIG.LENGTH && /^\d+$/.test(token);
}

export type OtpEventType =
  | "otp_sent"
  | "otp_resent"
  | "otp_verified"
  | "otp_failed"
  | "otp_expired"
  | "otp_locked"
  | "otp_resend_blocked";

export type VerificationErrorCode =
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "RESEND_COOLDOWN"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "USER_NOT_FOUND"
  | "ALREADY_VERIFIED"
  | "SERVICE_UNAVAILABLE";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return "***@***";
  const masked =
    local.length <= 3
      ? `${local[0]}***`
      : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${masked}@${domain}`;
}

export function mapSupabaseOtpError(message: string): {
  code: VerificationErrorCode;
  message: string;
} {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("otp has expired")) {
    return { code: "EXPIRED_CODE", message: "Code expired. Request a new one." };
  }
  if (
    lower.includes("invalid") ||
    lower.includes("token") ||
    lower.includes("otp")
  ) {
    return { code: "INVALID_CODE", message: "Invalid verification code." };
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return { code: "RATE_LIMITED", message: "Too many requests. Try again later." };
  }
  return { code: "INVALID_CODE", message: "Unable to verify. Check your connection." };
}

export async function logOtpEvent(
  db: SupabaseClient,
  event: {
    email: string;
    eventType: OtpEventType;
    userId?: string | null;
    ipAddress?: string;
    userAgent?: string | null;
    sessionFingerprint?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.from("otp_events").insert({
      email: normalizeEmail(event.email),
      user_id: event.userId ?? null,
      event_type: event.eventType,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      session_fingerprint: event.sessionFingerprint ?? null,
      metadata: event.metadata ?? {},
    });
  } catch (err) {
    console.error("[otp_events] Failed to log:", err);
  }
}

export async function logSecurityEvent(
  db: SupabaseClient,
  event: {
    eventType: string;
    email?: string | null;
    userId?: string | null;
    ipAddress?: string;
    userAgent?: string | null;
    sessionFingerprint?: string | null;
    details?: Record<string, unknown>;
    severity?: "info" | "warning" | "critical";
  },
): Promise<void> {
  try {
    await db.from("security_logs").insert({
      email: event.email ? normalizeEmail(event.email) : null,
      user_id: event.userId ?? null,
      event_type: event.eventType,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      session_fingerprint: event.sessionFingerprint ?? null,
      details: event.details ?? {},
      severity: event.severity ?? "info",
    });
  } catch (err) {
    console.error("[security_logs] Failed to log:", err);
  }
}

export async function getOrCreateVerificationAttempt(
  db: SupabaseClient,
  params: {
    email: string;
    ipAddress?: string;
    sessionFingerprint?: string;
    userId?: string | null;
  },
) {
  const email = normalizeEmail(params.email);

  const { data: existing } = await db
    .from("verification_attempts")
    .select("*")
    .eq("email", email)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await db
    .from("verification_attempts")
    .insert({
      email,
      user_id: params.userId ?? null,
      ip_address: params.ipAddress ?? null,
      session_fingerprint: params.sessionFingerprint ?? null,
      max_attempts: OTP_CONFIG.MAX_ATTEMPTS,
    })
    .select("*")
    .single();

  if (error) {
    const { data: retry } = await db
      .from("verification_attempts")
      .select("*")
      .eq("email", email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return retry;
  }

  return created;
}

export async function checkVerificationLock(
  db: SupabaseClient,
  email: string,
): Promise<{
  locked: boolean;
  remainingAttempts: number;
  lockedUntil?: string;
}> {
  const attempt = await getOrCreateVerificationAttempt(db, { email });

  if (!attempt) {
    return { locked: false, remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS };
  }

  if (attempt.locked_until) {
    const lockedUntil = new Date(attempt.locked_until);
    if (lockedUntil > new Date()) {
      return {
        locked: true,
        remainingAttempts: 0,
        lockedUntil: attempt.locked_until,
      };
    }
  }

  const remaining = Math.max(
    0,
    (attempt.max_attempts ?? OTP_CONFIG.MAX_ATTEMPTS) -
      (attempt.failed_attempts ?? 0),
  );

  return { locked: remaining === 0, remainingAttempts: remaining };
}

export async function recordFailedVerificationAttempt(
  db: SupabaseClient,
  params: {
    email: string;
    ipAddress?: string;
    sessionFingerprint?: string;
    userId?: string | null;
  },
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const email = normalizeEmail(params.email);
  const attempt = await getOrCreateVerificationAttempt(db, {
    email,
    ipAddress: params.ipAddress,
    sessionFingerprint: params.sessionFingerprint,
    userId: params.userId,
  });

  if (!attempt) {
    return { locked: false, remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS - 1 };
  }

  const newFailed = (attempt.failed_attempts ?? 0) + 1;
  const maxAttempts = attempt.max_attempts ?? OTP_CONFIG.MAX_ATTEMPTS;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    failed_attempts: newFailed,
    last_attempt_at: now,
    updated_at: now,
  };

  let locked = false;
  if (newFailed >= maxAttempts) {
    const lockedUntil = new Date(
      Date.now() + OTP_CONFIG.LOCKOUT_MINUTES * 60 * 1000,
    ).toISOString();
    updates.locked_until = lockedUntil;
    locked = true;
  }

  await db
    .from("verification_attempts")
    .update(updates)
    .eq("id", attempt.id);

  return {
    locked,
    remainingAttempts: Math.max(0, maxAttempts - newFailed),
  };
}

export async function recordSuccessfulVerification(
  db: SupabaseClient,
  params: {
    email: string;
    userId?: string | null;
    ipAddress?: string;
  },
): Promise<void> {
  const email = normalizeEmail(params.email);
  const now = new Date().toISOString();

  await db
    .from("verification_attempts")
    .update({
      verified_at: now,
      failed_attempts: 0,
      locked_until: null,
      updated_at: now,
    })
    .eq("email", email)
    .is("verified_at", null);
}

export async function checkResendCooldown(
  db: SupabaseClient,
  email: string,
): Promise<{ allowed: boolean; cooldownRemaining: number }> {
  const normalized = normalizeEmail(email);

  const { data: cooldown } = await db
    .from("otp_resend_cooldowns")
    .select("last_sent_at")
    .eq("email", normalized)
    .maybeSingle();

  if (!cooldown?.last_sent_at) {
    return { allowed: true, cooldownRemaining: 0 };
  }

  const elapsed = Math.floor(
    (Date.now() - new Date(cooldown.last_sent_at).getTime()) / 1000,
  );
  const remaining = OTP_CONFIG.RESEND_COOLDOWN_SECONDS - elapsed;

  if (remaining > 0) {
    return { allowed: false, cooldownRemaining: remaining };
  }

  return { allowed: true, cooldownRemaining: 0 };
}

export async function recordOtpSent(
  db: SupabaseClient,
  email: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("otp_resend_cooldowns")
    .select("id, send_count")
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    await db
      .from("otp_resend_cooldowns")
      .update({
        last_sent_at: now,
        send_count: (existing.send_count ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await db.from("otp_resend_cooldowns").insert({
      email: normalized,
      last_sent_at: now,
      send_count: 1,
    });
  }
}

export async function lookupUserByEmail(
  db: SupabaseClient,
  email: string,
): Promise<{ id: string; emailConfirmed: boolean } | null> {
  const normalized = normalizeEmail(email);

  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: authUser, error } = await db.auth.admin.getUserById(profile.id);
    if (!error && authUser?.user) {
      return {
        id: authUser.user.id,
        emailConfirmed: Boolean(authUser.user.email_confirmed_at),
      };
    }
  }

  const { data: authData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const match = authData?.users?.find(
    (u) => u.email?.toLowerCase() === normalized,
  );
  if (!match) return null;

  return {
    id: match.id,
    emailConfirmed: Boolean(match.email_confirmed_at),
  };
}
