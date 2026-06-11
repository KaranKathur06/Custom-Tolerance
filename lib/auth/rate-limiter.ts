/**
 * Metal Hub — Database-Backed Rate Limiter
 *
 * Uses the `rate_limits` table in Supabase instead of Redis.
 * Works across all serverless instances (no in-memory state).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

export type RateLimitProfile = {
  action: string;
  maxAttempts: number;
  windowMinutes: number;
  /** Max block duration when limit exceeded (defaults to windowMinutes × 2) */
  blockMinutes?: number;
};

/**
 * Check if an action is rate-limited for a given identifier.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number,
  blockMinutes?: number,
): Promise<RateLimitResult> {
  const blockDurationMs = (blockMinutes ?? windowMinutes * 2) * 60 * 1000;
  const now = new Date();

  // Find active rate limit window for this identifier + action
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('id, attempts, window_start, window_end, blocked_until')
    .eq('identifier', identifier)
    .eq('action', action)
    .gt('window_end', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check if currently blocked
  if (existing?.blocked_until) {
    const blockedUntil = new Date(existing.blocked_until);
    if (blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
      };
    }
  }

  // No existing window — create one
  if (!existing) {
    const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);
    await supabase.from('rate_limits').insert({
      identifier,
      action,
      attempts: 1,
      window_start: now.toISOString(),
      window_end: windowEnd.toISOString(),
    });

    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Window exists — check if under limit
  if (existing.attempts >= maxAttempts) {
    const blockedUntil = new Date(now.getTime() + blockDurationMs);

    await supabase
      .from('rate_limits')
      .update({ blocked_until: blockedUntil.toISOString() })
      .eq('id', existing.id);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(blockDurationMs / 1000),
    };
  }

  // Increment attempts
  await supabase
    .from('rate_limits')
    .update({ attempts: existing.attempts + 1 })
    .eq('id', existing.id);

  return {
    allowed: true,
    remaining: maxAttempts - existing.attempts - 1,
  };
}

/**
 * Reset rate limit for an identifier + action.
 * Call this after a successful operation (e.g., successful login).
 */
export async function resetRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
): Promise<void> {
  await supabase
    .from('rate_limits')
    .delete()
    .eq('identifier', identifier)
    .eq('action', action);
}

// ── Pre-configured rate limit profiles ──

export const RATE_LIMITS = {
  LOGIN: { action: 'login', maxAttempts: 5, windowMinutes: 15 },
  /** Admin 2FA OTP — max 2-minute block, 5 sends per 2-minute window */
  ADMIN_OTP_SEND: {
    action: 'admin_otp_send',
    maxAttempts: 5,
    windowMinutes: 2,
    blockMinutes: 2,
  },
  OTP_SEND: { action: 'otp_send', maxAttempts: 3, windowMinutes: 10 },
  OTP_VERIFY: { action: 'otp_verify', maxAttempts: 5, windowMinutes: 10 },
  SIGNUP_OTP_SEND: { action: 'signup_otp_send', maxAttempts: 5, windowMinutes: 30 },
  SIGNUP_OTP_VERIFY: { action: 'signup_otp_verify', maxAttempts: 10, windowMinutes: 30 },
  PASSWORD_RESET: { action: 'password_reset', maxAttempts: 3, windowMinutes: 60 },
  API_GENERAL: { action: 'api_general', maxAttempts: 100, windowMinutes: 1 },
  FILE_UPLOAD: { action: 'file_upload', maxAttempts: 20, windowMinutes: 10 },
  PRODUCT_CREATE: { action: 'product_create', maxAttempts: 10, windowMinutes: 60 },
} as const;
