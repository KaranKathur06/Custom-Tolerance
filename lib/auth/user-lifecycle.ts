/**
 * User Lifecycle Guards
 *
 * Prevents security holes in user lifecycle transitions:
 * 1. Deleted users cannot re-register with the same email/phone
 * 2. Suspended/banned users cannot log in
 * 3. Session invalidation for deleted accounts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export type AccountLifecycleCheck = {
  allowed: boolean;
  reason?: string;
  code?: string;
};

/**
 * Check if a user can register with the given email.
 * Blocks re-registration if the email belongs to a deleted account.
 * Uses service role to bypass RLS (deleted profiles may be hidden).
 */
export async function canRegisterEmail(email: string): Promise<AccountLifecycleCheck> {
  const db = createSupabaseServiceRoleClient();
  if (!db) {
    // If service role is unavailable, allow registration and let
    // Supabase Auth handle duplicate detection
    return { allowed: true };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check profiles table for deleted accounts with this email
  const { data: deletedProfile } = await db
    .from("profiles")
    .select("id, deleted_at, enforcement_status")
    .eq("email", normalizedEmail)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (deletedProfile) {
    return {
      allowed: false,
      reason: "This email address is associated with a previously deleted account. Please contact support.",
      code: "DELETED_ACCOUNT_EMAIL",
    };
  }

  // Check for banned accounts
  const { data: bannedProfile } = await db
    .from("profiles")
    .select("id, enforcement_status")
    .eq("email", normalizedEmail)
    .eq("enforcement_status", "banned")
    .maybeSingle();

  if (bannedProfile) {
    return {
      allowed: false,
      reason: "This email address cannot be used for registration. Please contact support.",
      code: "BANNED_ACCOUNT_EMAIL",
    };
  }

  return { allowed: true };
}

/**
 * Check if a user can register with the given phone number.
 */
export async function canRegisterPhone(phone: string): Promise<AccountLifecycleCheck> {
  const db = createSupabaseServiceRoleClient();
  if (!db) return { allowed: true };

  const normalizedPhone = phone.replace(/\D/g, "");

  const { data: deletedProfile } = await db
    .from("profiles")
    .select("id, deleted_at")
    .eq("phone", normalizedPhone)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (deletedProfile) {
    return {
      allowed: false,
      reason: "This phone number is associated with a previously deleted account. Please contact support.",
      code: "DELETED_ACCOUNT_PHONE",
    };
  }

  return { allowed: true };
}

/**
 * Check if an authenticated user's account is still active.
 * Should be called during login and token refresh.
 */
export async function isAccountActive(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountLifecycleCheck> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at, enforcement_status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    // No profile yet — account is in onboarding
    return { allowed: true };
  }

  if (profile.deleted_at) {
    return {
      allowed: false,
      reason: "This account has been deleted.",
      code: "ACCOUNT_DELETED",
    };
  }

  if (profile.enforcement_status === "banned") {
    return {
      allowed: false,
      reason: "This account has been banned.",
      code: "ACCOUNT_BANNED",
    };
  }

  if (profile.enforcement_status === "suspended") {
    return {
      allowed: false,
      reason: "This account has been temporarily suspended.",
      code: "ACCOUNT_SUSPENDED",
    };
  }

  return { allowed: true };
}

/**
 * Invalidate all sessions for a user.
 * Should be called when an admin deletes or bans an account.
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  const db = createSupabaseServiceRoleClient();
  if (!db) return;

  // Revoke admin sessions
  await db
    .from("admin_sessions")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Force sign-out via Supabase Admin API
  try {
    await db.auth.admin.signOut(userId);
  } catch (err) {
    console.error("[UserLifecycle] Failed to invalidate auth sessions:", err);
  }
}
