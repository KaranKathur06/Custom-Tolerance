/**
 * Central Authorization Primitives
 *
 * Reusable server-side functions for route/action authorization.
 * These should be used by ALL API routes and server actions.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   const admin = await requireAdmin(request);
 *   const seller = await requireSeller(request);
 *   await requireOwnership(supabase, resourceOwnerId, userId);
 */

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { resolveEffectiveRole, isSuperAdminRole, isAdminRole } from "@/lib/auth/rbac";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthContext = {
  user: User;
  supabase: SupabaseClient;
  role: string;
  userId: string;
};

export type AuthError = {
  code: string;
  message: string;
  status: number;
};

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; error: AuthError };

/**
 * Require an authenticated user. Returns the user context or an error.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Auth service unavailable", status: 503 },
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: { code: "AUTH_REQUIRED", message: "Authentication required", status: 401 },
    };
  }

  // Resolve role from profiles table (server-side authoritative)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = resolveEffectiveRole({
    profileRole: profile?.role,
    appMetadataRole: user.app_metadata?.role,
    userMetadataRole: user.user_metadata?.role,
  });

  return {
    ok: true,
    ctx: { user, supabase, role, userId: user.id },
  };
}

/**
 * Require an admin user (any admin-grade role).
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (!isAdminRole(result.ctx.role)) {
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "Admin access required", status: 403 },
    };
  }

  return result;
}

/**
 * Require a super_admin user.
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (!isSuperAdminRole(result.ctx.role)) {
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "Super admin access required", status: 403 },
    };
  }

  return result;
}

/**
 * Require a seller user.
 */
export async function requireSeller(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  const sellerRoles = new Set(["seller", "manufacturer", "distributor", "both"]);
  if (!sellerRoles.has(result.ctx.role) && !isSuperAdminRole(result.ctx.role)) {
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "Seller access required", status: 403 },
    };
  }

  return result;
}

/**
 * Require a buyer user.
 */
export async function requireBuyer(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  const buyerRoles = new Set(["buyer", "both"]);
  if (!buyerRoles.has(result.ctx.role) && !isSuperAdminRole(result.ctx.role)) {
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "Buyer access required", status: 403 },
    };
  }

  return result;
}

/**
 * Require that the authenticated user owns the specified resource.
 * Super admins bypass ownership checks.
 */
export async function requireOwnership(
  ctx: AuthContext,
  resourceOwnerId: string,
): Promise<AuthResult> {
  if (isSuperAdminRole(ctx.role)) {
    return { ok: true, ctx };
  }

  if (ctx.userId !== resourceOwnerId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have access to this resource",
        status: 403,
      },
    };
  }

  return { ok: true, ctx };
}

/**
 * Require a user with a specific set of roles.
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (isSuperAdminRole(result.ctx.role)) {
    return result; // super_admin has all roles
  }

  if (!allowedRoles.includes(result.ctx.role)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: `Role '${result.ctx.role}' is not authorized for this action`,
        status: 403,
      },
    };
  }

  return result;
}

/**
 * Check that the admin has a valid 2FA session.
 */
export async function requireAdmin2FA(ctx: AuthContext): Promise<AuthResult> {
  const { data: adminSession } = await ctx.supabase
    .from("admin_sessions")
    .select("id, expires_at")
    .eq("user_id", ctx.userId)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!adminSession) {
    return {
      ok: false,
      error: {
        code: "ADMIN_2FA_REQUIRED",
        message: "Admin 2FA verification required",
        status: 403,
      },
    };
  }

  return { ok: true, ctx };
}

/**
 * Check that the user's account is active (not deleted/suspended).
 */
export async function requireActiveAccount(ctx: AuthContext): Promise<AuthResult> {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("deleted_at, enforcement_status")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (profile?.deleted_at) {
    return {
      ok: false,
      error: { code: "ACCOUNT_DELETED", message: "This account has been deleted", status: 403 },
    };
  }

  if (profile?.enforcement_status === "suspended" || profile?.enforcement_status === "banned") {
    return {
      ok: false,
      error: {
        code: "ACCOUNT_SUSPENDED",
        message: "This account has been suspended",
        status: 403,
      },
    };
  }

  return { ok: true, ctx };
}
