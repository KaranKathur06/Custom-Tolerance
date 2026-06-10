/**
 * POST /api/auth/verify-email/verify
 * Verifies signup OTP via supabase.auth.verifyOtp() and establishes session.
 */

import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { resolveAuthRole } from "@/lib/auth/profile-role";
import { getOnboardingHref } from "@/lib/marketplace/auth-navigation";
import {
  checkVerificationLock,
  logOtpEvent,
  logSecurityEvent,
  lookupUserByEmail,
  mapSupabaseOtpError,
  normalizeEmail,
  OTP_CONFIG,
  recordFailedVerificationAttempt,
  recordSuccessfulVerification,
} from "@/lib/auth/verification-security";
import {
  createMutableRouteHandlerSupabaseClient,
  getClientIp,
  getSessionFingerprint,
  jsonResponseWithCookies,
} from "@/lib/auth/route-handler-client";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/auth/rate-limiter";
import { verifySignupOtp } from "@/lib/auth/supabase-signup-otp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const pendingCookies: Parameters<typeof createMutableRouteHandlerSupabaseClient>[1] = [];

  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email ?? "");
    const token = String(body?.token ?? "").replace(/\D/g, "").slice(0, 6);

    if (!email || token.length !== 6) {
      return jsonResponseWithCookies(
        { error: "Enter the complete 6-digit code.", code: "INVALID_CODE" },
        pendingCookies,
        { status: 400 },
      );
    }

    const ip = getClientIp(request);
    const sessionFingerprint = getSessionFingerprint(request);
    const userAgent = request.headers.get("user-agent");

    const serviceDb = createSupabaseServiceRoleClient();
    if (!serviceDb) {
      return jsonResponseWithCookies(
        { error: "Service unavailable." },
        pendingCookies,
        { status: 503 },
      );
    }

    const userLookup = await lookupUserByEmail(serviceDb, email);
    if (!userLookup) {
      return jsonResponseWithCookies(
        { error: "No account found for this email." },
        pendingCookies,
        { status: 404 },
      );
    }

    if (userLookup.emailConfirmed) {
      return jsonResponseWithCookies(
        {
          success: true,
          code: "ALREADY_VERIFIED",
          redirectTo: "/login",
        },
        pendingCookies,
      );
    }

    const verifyRateLimit = await checkRateLimit(
      serviceDb,
      `signup_otp_verify:${email}:${ip}`,
      RATE_LIMITS.SIGNUP_OTP_VERIFY.action,
      RATE_LIMITS.SIGNUP_OTP_VERIFY.maxAttempts,
      RATE_LIMITS.SIGNUP_OTP_VERIFY.windowMinutes,
    );

    if (!verifyRateLimit.allowed) {
      return jsonResponseWithCookies(
        {
          error: "Too many verification attempts. Try again later.",
          code: "RATE_LIMITED",
          retryAfterSeconds: verifyRateLimit.retryAfterSeconds,
        },
        pendingCookies,
        { status: 429 },
      );
    }

    const lockStatus = await checkVerificationLock(serviceDb, email);
    if (lockStatus.locked) {
      await logOtpEvent(serviceDb, {
        email,
        eventType: "otp_locked",
        userId: userLookup.id,
        ipAddress: ip,
        userAgent,
        sessionFingerprint,
      });

      return jsonResponseWithCookies(
        {
          error: "Too many attempts. Please request a new code.",
          code: "TOO_MANY_ATTEMPTS",
          remainingAttempts: 0,
        },
        pendingCookies,
        { status: 429 },
      );
    }

    const supabase = createMutableRouteHandlerSupabaseClient(request, pendingCookies);
    if (!supabase) {
      return jsonResponseWithCookies(
        { error: "Auth service unavailable." },
        pendingCookies,
        { status: 503 },
      );
    }

    const { data, error: verifyError } = await verifySignupOtp(supabase, email, token);

    if (verifyError || !data.session) {
      const mapped = mapSupabaseOtpError(verifyError?.message ?? "Invalid token");

      const attemptResult = await recordFailedVerificationAttempt(serviceDb, {
        email,
        ipAddress: ip,
        sessionFingerprint,
        userId: userLookup.id,
      });

      await logOtpEvent(serviceDb, {
        email,
        eventType: mapped.code === "EXPIRED_CODE" ? "otp_expired" : "otp_failed",
        userId: userLookup.id,
        ipAddress: ip,
        userAgent,
        sessionFingerprint,
        metadata: {
          remainingAttempts: attemptResult.remainingAttempts,
          message: verifyError?.message,
        },
      });

      await logSecurityEvent(serviceDb, {
        eventType: "signup_otp_verify_failed",
        email,
        userId: userLookup.id,
        ipAddress: ip,
        userAgent,
        sessionFingerprint,
        details: {
          code: mapped.code,
          remainingAttempts: attemptResult.remainingAttempts,
        },
        severity: attemptResult.locked ? "warning" : "info",
      });

      const errorMessage = attemptResult.locked
        ? "Too many attempts. Please request a new code."
        : mapped.message;

      return jsonResponseWithCookies(
        {
          error: errorMessage,
          code: attemptResult.locked ? "TOO_MANY_ATTEMPTS" : mapped.code,
          remainingAttempts: attemptResult.remainingAttempts,
        },
        pendingCookies,
        { status: attemptResult.locked ? 429 : 400 },
      );
    }

    await recordSuccessfulVerification(serviceDb, {
      email,
      userId: data.user?.id ?? userLookup.id,
      ipAddress: ip,
    });

    await resetRateLimit(serviceDb, `signup_otp_send:${email}:${ip}`, "signup_otp_send");
    await resetRateLimit(serviceDb, `signup_otp_resend:${email}:${ip}`, "signup_otp_send");
    await resetRateLimit(
      serviceDb,
      `signup_otp_verify:${email}:${ip}`,
      RATE_LIMITS.SIGNUP_OTP_VERIFY.action,
    );

    await logOtpEvent(serviceDb, {
      email,
      eventType: "otp_verified",
      userId: data.user?.id ?? userLookup.id,
      ipAddress: ip,
      userAgent,
      sessionFingerprint,
    });

    await logSecurityEvent(serviceDb, {
      eventType: "signup_email_verified",
      email,
      userId: data.user?.id ?? userLookup.id,
      ipAddress: ip,
      userAgent,
      sessionFingerprint,
      details: { autoLogin: true },
    });

    let redirectTo = "/onboarding";
    if (data.user) {
      const { data: profile } = await serviceDb
        .from("profiles")
        .select("role, profile_status, onboarding_step")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = resolveAuthRole({
        profileRole: profile?.role,
        appMetadataRole: data.user.app_metadata?.role,
        userMetadataRole: data.user.user_metadata?.role,
      });

      redirectTo = getOnboardingHref(role);
    }

    return jsonResponseWithCookies(
      {
        success: true,
        redirectTo,
        remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS,
      },
      pendingCookies,
    );
  } catch (err) {
    console.error("[verify-email/verify]", err);
    return jsonResponseWithCookies(
      { error: "Unable to verify. Check your connection.", code: "NETWORK_ERROR" },
      pendingCookies,
      { status: 500 },
    );
  }
}
