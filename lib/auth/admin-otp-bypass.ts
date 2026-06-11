/**
 * Temporary Super Admin OTP bypass — single-flag disable.
 * OTP remains mandatory for all other users and roles.
 */

import { isSuperAdminRole, normalizeStoredRole } from "@/lib/auth/rbac";

export const SUPER_ADMIN_OTP_BYPASS_AUDIT_ACTION = "SUPER_ADMIN_OTP_BYPASS_USED";

/** Set SUPER_ADMIN_OTP_BYPASS_ENABLED=true in Vercel/env to activate. */
export function isSuperAdminOtpBypassEnabled(): boolean {
  return process.env.SUPER_ADMIN_OTP_BYPASS_ENABLED === "true";
}

export function getSuperAdminOtpBypassEmail(): string {
  return (
    process.env.SUPER_ADMIN_OTP_BYPASS_EMAIL?.trim().toLowerCase() ||
    "kathurkaran077@gmail.com"
  );
}

export function normalizeBypassEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Bypass applies only when:
 * - flag enabled
 * - exact allowed email
 * - user is super_admin (not admin, seller, buyer, etc.)
 */
export function isSuperAdminOtpBypassEligible(
  email: string | null | undefined,
  role: unknown,
): boolean {
  if (!isSuperAdminOtpBypassEnabled()) return false;
  if (!email) return false;
  if (!isSuperAdminRole(role)) return false;
  return normalizeBypassEmail(email) === getSuperAdminOtpBypassEmail();
}

export function resolveBypassRole(
  profileRole: unknown,
  appMetadataRole: unknown,
  userMetadataRole: unknown,
): string {
  const normalized = normalizeStoredRole(profileRole);
  if (isSuperAdminRole(normalized)) return "super_admin";
  if (isSuperAdminRole(appMetadataRole)) return "super_admin";
  if (isSuperAdminRole(userMetadataRole)) return "super_admin";
  return normalized;
}
