/** @deprecated Bypass removed — always returns false */
export function isSuperAdminOtpBypassEnabled(): boolean {
  return false;
}

/** @deprecated Bypass removed — always returns empty string */
export function getSuperAdminOtpBypassEmail(): string {
  return "";
}

/** @deprecated Bypass removed — always returns normalized input */
export function normalizeBypassEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** @deprecated Bypass removed — always returns false */
export function isSuperAdminOtpBypassEligible(
  _email: string | null | undefined,
  _role: unknown,
): boolean {
  return false;
}

/** @deprecated Use resolveEffectiveRole from rbac.ts instead */
export function resolveBypassRole(
  profileRole: unknown,
  _appMetadataRole: unknown,
  _userMetadataRole: unknown,
): string {
  const { normalizeStoredRole } = require("@/lib/auth/rbac");
  return normalizeStoredRole(profileRole);
}

export const SUPER_ADMIN_OTP_BYPASS_AUDIT_ACTION = "SUPER_ADMIN_OTP_BYPASS_USED";
