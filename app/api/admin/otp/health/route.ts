/**
 * GET /api/admin/otp/health — Admin OTP + email delivery diagnostics
 * Does not send email; safe to call for preflight checks.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { canRequestAdminOtp, resolveEffectiveRole } from "@/lib/auth/rbac";
import { getEmailConfigSnapshot } from "@/lib/services/email-diagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        code: "SUPABASE_UNAVAILABLE",
        message: "Supabase client could not be initialized.",
      },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, code: "AUTH_REQUIRED", message: "Authentication required." },
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
      { ok: false, code: "FORBIDDEN", message: "Admin OTP access required." },
      { status: 403 },
    );
  }

  const emailConfig = getEmailConfigSnapshot();
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const { error: otpTableError } = await supabase
    .from("otp_verifications")
    .select("id")
    .limit(1);

  return NextResponse.json({
    ok: emailConfig.resendApiKeyConfigured,
    checks: {
      session: true,
      adminRole: true,
      role,
      resendApiKey: emailConfig.resendApiKeyConfigured,
      emailFromAddress: emailConfig.fromAddress,
      emailFromDomain: emailConfig.fromDomain,
      serviceRoleKey: serviceRoleConfigured,
      otpTableReadable: !otpTableError,
      otpTableError: otpTableError?.message ?? null,
      runtime: "nodejs",
      nodeEnv: process.env.NODE_ENV,
    },
    hints: [
      !emailConfig.resendApiKeyConfigured
        ? "RESEND_API_KEY missing in this deployment — redeploy after adding to Vercel Production."
        : null,
      !serviceRoleConfigured
        ? "SUPABASE_SERVICE_ROLE_KEY missing — OTP writes may rely on RLS policies."
        : null,
      emailConfig.fromDomain !== "customtolerance.com"
        ? `EMAIL_FROM_ADDRESS domain is ${emailConfig.fromDomain} — must match your verified Resend domain.`
        : null,
    ].filter(Boolean),
  });
}
