/**
 * POST /api/admin/otp/send — Send admin 2FA OTP
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { canRequestAdminOtp, resolveEffectiveRole } from "@/lib/auth/rbac";
import { authLog } from "@/lib/auth/auth-logger";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { generateOTP, hashOTP, getOTPExpiry } from "@/lib/auth/otp";
import { sendEmail, otpEmailTemplate } from "@/lib/services/email";
import {
  getEmailConfigSnapshot,
  userFacingEmailError,
} from "@/lib/services/email-diagnostics";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RATE_LIMIT_SECONDS = 120;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const masked =
    local.length <= 3 ? `${local[0]}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${masked}@${domain}`;
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
    console.error("[Audit] Failed to log event:", err);
  }
}

export async function POST(req: NextRequest) {
  const step = (label: string, meta?: Record<string, unknown>) => {
    console.log(`[Admin OTP] ${label}`, meta ?? {});
  };

  try {
    step("STEP 1: request received");

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
      step("STEP 2: session missing", { userError: userError?.message });
      return NextResponse.json(
        { error: "Session expired. Please sign in again.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    step("STEP 2: session loaded", { userId: user.id, email: maskEmail(user.email) });

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

    authLog("admin_otp_send", "role check", {
      userId: user.id,
      role,
      rawProfileRole: profile?.role,
    });

    if (!canRequestAdminOtp(role)) {
      step("STEP 3: admin validation failed", { role });
      await logAuditEvent(supabase, {
        userId: user.id,
        action: "ADMIN_OTP_UNAUTHORIZED_ATTEMPT",
        details: { role, rawProfileRole: profile?.role, email: user.email },
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Insufficient permissions.", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    step("STEP 3: admin validated", { role });

    const db = createSupabaseServiceRoleClient() ?? supabase;
    const emailConfig = getEmailConfigSnapshot();

    const { data: recentOtp } = await db
      .from("otp_verifications")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("purpose", "admin_2fa")
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      const cooldownEnd =
        new Date(recentOtp.created_at).getTime() + RESEND_COOLDOWN_SECONDS * 1000;
      if (Date.now() < cooldownEnd) {
        const remainingSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${remainingSeconds} seconds before requesting a new code`,
            code: "RESEND_COOLDOWN",
            cooldownRemaining: remainingSeconds,
          },
          { status: 429 },
        );
      }
    }

    const adminOtpLimit = RATE_LIMITS.ADMIN_OTP_SEND;
    const rateLimitResult = await checkRateLimit(
      db,
      `admin_otp_send:${user.id}`,
      adminOtpLimit.action,
      adminOtpLimit.maxAttempts,
      adminOtpLimit.windowMinutes,
      adminOtpLimit.blockMinutes,
    );

    if (!rateLimitResult.allowed) {
      const retrySeconds = Math.min(
        rateLimitResult.retryAfterSeconds ?? MAX_RATE_LIMIT_SECONDS,
        MAX_RATE_LIMIT_SECONDS,
      );
      return NextResponse.json(
        {
          error: `Too many requests. Try again in ${retrySeconds} seconds.`,
          code: "RATE_LIMITED",
          retryAfterSeconds: retrySeconds,
        },
        { status: 429 },
      );
    }

    // Invalidate any previous unused OTPs
    await db
      .from("otp_verifications")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("purpose", "admin_2fa")
      .eq("is_used", false);

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry();

    step("STEP 4: OTP generated");

    const { data: insertedOtp, error: insertError } = await db
      .from("otp_verifications")
      .insert({
        user_id: user.id,
        email: user.email,
        otp_hash: otpHash,
        purpose: "admin_2fa",
        attempts: 0,
        max_attempts: 5,
        is_used: false,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIp(req),
        user_agent: req.headers.get("user-agent") || null,
      })
      .select("id")
      .single();

    if (insertError || !insertedOtp?.id) {
      console.error("[Admin OTP] STEP 5 FAILED: OTP persistence", {
        code: insertError?.code,
        message: insertError?.message,
      });
      return NextResponse.json(
        {
          error: "Failed to store verification code. Database may be unavailable.",
          code: "OTP_STORAGE_FAILED",
          details:
            process.env.NODE_ENV === "development" ? insertError?.message : undefined,
        },
        { status: 500 },
      );
    }

    step("STEP 5: OTP saved", { otpId: insertedOtp.id });

    const template = otpEmailTemplate(otp, OTP_EXPIRY_MINUTES);

    step("STEP 6: Resend dispatch", {
      resendConfigured: emailConfig.resendApiKeyConfigured,
      from: emailConfig.fromAddress,
      to: maskEmail(user.email),
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    const deliveryMode = emailConfig.resendApiKeyConfigured ? "resend" : "console";

    if (emailConfig.resendApiKeyConfigured && !emailResult.success) {
      console.error("[Admin OTP] STEP 7 FAILED: email delivery", {
        code: emailResult.code,
        error: emailResult.error,
        providerStatus: emailResult.providerStatus,
        hint: emailResult.hint,
      });

      await db.from("otp_verifications").delete().eq("id", insertedOtp.id);

      await logAuditEvent(db, {
        userId: user.id,
        action: "ADMIN_OTP_EMAIL_FAILED",
        details: {
          email: user.email,
          code: emailResult.code,
          error: emailResult.error,
          providerStatus: emailResult.providerStatus,
          from: emailConfig.fromAddress,
        },
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
        severity: "warning",
      });

      return NextResponse.json(
        {
          error: userFacingEmailError(emailResult.code ?? "EMAIL_PROVIDER_REJECTED"),
          code: emailResult.code ?? "EMAIL_PROVIDER_REJECTED",
          hint: emailResult.hint,
          providerStatus: emailResult.providerStatus,
          details:
            process.env.NODE_ENV === "development" ? emailResult.error : undefined,
        },
        { status: 502 },
      );
    }

    step("STEP 7: email sent", {
      messageId: emailResult.messageId,
      deliveryMode,
    });

    await logAuditEvent(db, {
      userId: user.id,
      action: "ADMIN_OTP_SENT",
      details: {
        email: user.email,
        emailDelivered: emailResult.success,
        deliveryMode,
        messageId: emailResult.messageId,
      },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      severity: "info",
    });

    return NextResponse.json({
      success: true,
      message: emailResult.success
        ? "Verification code sent to your email"
        : "Code generated — email provider not configured on server",
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      email: maskEmail(user.email),
      emailDelivered: emailConfig.resendApiKeyConfigured && emailResult.success,
      deliveryMode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[Admin OTP] UNHANDLED FAILURE", { message, stack });
    return NextResponse.json(
      { error: "Internal server error.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
