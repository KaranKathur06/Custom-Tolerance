/**
 * GET /api/admin/otp/status — Check current admin 2FA OTP state
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { canRequestAdminOtp, resolveEffectiveRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const masked =
    local.length <= 3 ? `${local[0]}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${masked}@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Auth service unavailable.", code: "SUPABASE_UNAVAILABLE" },
        { status: 503 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        { status: "UNAUTHENTICATED" },
        { status: 401 },
      );
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
      return NextResponse.json(
        { status: "UNAUTHENTICATED", error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Check for an active admin session first to see if they are fully authenticated
    const sessionTokenCookie = req.cookies.get("admin_verified");
    if (sessionTokenCookie?.value) {
      try {
        const parsed = JSON.parse(sessionTokenCookie.value);
        if (parsed.verified && parsed.expires > Date.now()) {
          return NextResponse.json({ status: "SESSION_ACTIVE" });
        }
      } catch (e) {
        // invalid cookie format, ignore
      }
    }

    const db = createSupabaseServiceRoleClient() ?? supabase;

    const { data: recentOtp } = await db
      .from("otp_verifications")
      .select("created_at, expires_at, attempts, max_attempts")
      .eq("user_id", user.id)
      .eq("purpose", "admin_2fa")
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentOtp) {
      return NextResponse.json({ status: "PENDING_2FA" });
    }

    const now = Date.now();
    const expiresAt = new Date(recentOtp.expires_at).getTime();

    if (now > expiresAt) {
      // OTP is expired
      return NextResponse.json({ status: "PENDING_2FA" });
    }

    const createdAt = new Date(recentOtp.created_at).getTime();
    const cooldownEnd = createdAt + RESEND_COOLDOWN_SECONDS * 1000;
    
    const expiresInSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const cooldownRemainingSeconds = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
    const remainingAttempts = Math.max(0, recentOtp.max_attempts - recentOtp.attempts);

    return NextResponse.json({
      status: "OTP_SENT",
      email: maskEmail(user.email),
      expiresIn: expiresInSeconds,
      cooldown: cooldownRemainingSeconds,
      remainingAttempts: remainingAttempts,
    });

  } catch (error: unknown) {
    console.error("[Admin OTP Status] UNHANDLED FAILURE", error);
    return NextResponse.json(
      { error: "Internal server error.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
