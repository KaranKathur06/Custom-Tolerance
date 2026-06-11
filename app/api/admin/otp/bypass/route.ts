/**
 * POST /api/admin/otp/bypass
 * Temporary Super Admin OTP bypass for a single configured email.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { canRequestAdminOtp, resolveEffectiveRole } from "@/lib/auth/rbac";
import {
  isSuperAdminOtpBypassEligible,
  isSuperAdminOtpBypassEnabled,
  SUPER_ADMIN_OTP_BYPASS_AUDIT_ACTION,
} from "@/lib/auth/admin-otp-bypass";
import {
  applyAdminVerifiedCookie,
  createAdminElevatedSession,
} from "@/lib/auth/admin-session";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function logAuditEvent(
  db: SupabaseClient,
  event: {
    userId: string;
    action: string;
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    severity?: string;
  },
) {
  try {
    await db.from("admin_audit_logs").insert({
      user_id: event.userId,
      action: event.action,
      details: event.details ?? {},
      ip_address: event.ip ?? "unknown",
      user_agent: event.userAgent ?? null,
      severity: event.severity ?? "info",
    });
  } catch (err) {
    console.error("[Admin OTP Bypass] Audit log failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSuperAdminOtpBypassEnabled()) {
      return NextResponse.json(
        { error: "OTP bypass is disabled.", code: "BYPASS_DISABLED" },
        { status: 403 },
      );
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

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

    if (!canRequestAdminOtp(role)) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    if (!isSuperAdminOtpBypassEligible(user.email, role)) {
      return NextResponse.json(
        { error: "OTP verification is required for this account.", code: "BYPASS_NOT_ALLOWED" },
        { status: 403 },
      );
    }

    const db = createSupabaseServiceRoleClient() ?? supabase;
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const { data: existingSession } = await db
      .from("admin_sessions")
      .select("id, session_token, expires_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionToken = existingSession?.session_token as string | undefined;
    let expiresAt = existingSession?.expires_at
      ? new Date(existingSession.expires_at)
      : null;

    if (!sessionToken || !expiresAt) {
      const created = await createAdminElevatedSession(db, {
        userId: user.id,
        ipAddress: ip,
        userAgent,
        devicePlatform: req.headers.get("sec-ch-ua-platform"),
        deviceMobile: req.headers.get("sec-ch-ua-mobile"),
      });

      if (created.error) {
        console.error("[Admin OTP Bypass] Session create failed:", created.error);
        return NextResponse.json(
          { error: "Failed to establish admin session.", code: "SESSION_FAILED" },
          { status: 500 },
        );
      }

      sessionToken = created.sessionToken;
      expiresAt = created.expiresAt;

      await logAuditEvent(db, {
        userId: user.id,
        action: SUPER_ADMIN_OTP_BYPASS_AUDIT_ACTION,
        details: {
          email: user.email,
          reason: "resend_email_recovery",
          expiresAt: expiresAt.toISOString(),
        },
        ip,
        userAgent: userAgent || undefined,
        severity: "warning",
      });
    }

    const response = NextResponse.json({
      success: true,
      bypass: true,
      message: "Super Admin OTP bypass active.",
      expiresAt: expiresAt!.toISOString(),
    });

    applyAdminVerifiedCookie(response, {
      sessionToken: sessionToken!,
      userId: user.id,
      expiresAt: expiresAt!,
      bypass: true,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Admin OTP Bypass] Error:", message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
