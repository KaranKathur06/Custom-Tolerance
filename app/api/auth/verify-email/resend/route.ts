/**
 * POST /api/auth/verify-email/resend
 * Resend signup OTP via signInWithOtp with 60-second cooldown protection.
 */

import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limiter";
import {
  checkResendCooldown,
  logOtpEvent,
  logSecurityEvent,
  lookupUserByEmail,
  maskEmail,
  normalizeEmail,
  OTP_CONFIG,
  recordOtpSent,
} from "@/lib/auth/verification-security";
import {
  createMutableRouteHandlerSupabaseClient,
  getClientIp,
  getSessionFingerprint,
  jsonResponseWithCookies,
} from "@/lib/auth/route-handler-client";
import { deliverSignupVerificationOtp } from "@/lib/auth/supabase-signup-otp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const pendingCookies: Parameters<typeof createMutableRouteHandlerSupabaseClient>[1] = [];

  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email ?? "");

    if (!email) {
      return jsonResponseWithCookies(
        { error: "Email is required." },
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
        { error: "Email already verified.", code: "ALREADY_VERIFIED" },
        pendingCookies,
        { status: 400 },
      );
    }

    const cooldown = await checkResendCooldown(serviceDb, email);
    if (!cooldown.allowed) {
      await logOtpEvent(serviceDb, {
        email,
        eventType: "otp_resend_blocked",
        userId: userLookup.id,
        ipAddress: ip,
        userAgent,
        sessionFingerprint,
        metadata: { cooldownRemaining: cooldown.cooldownRemaining },
      });

      return jsonResponseWithCookies(
        {
          error: `Resend available in ${cooldown.cooldownRemaining}s.`,
          code: "RESEND_COOLDOWN",
          cooldownRemaining: cooldown.cooldownRemaining,
        },
        pendingCookies,
        { status: 429 },
      );
    }

    const rateLimit = await checkRateLimit(
      serviceDb,
      `signup_otp_resend:${email}:${ip}`,
      RATE_LIMITS.SIGNUP_OTP_SEND.action,
      RATE_LIMITS.SIGNUP_OTP_SEND.maxAttempts,
      RATE_LIMITS.SIGNUP_OTP_SEND.windowMinutes,
    );

    if (!rateLimit.allowed) {
      return jsonResponseWithCookies(
        {
          error: "Too many resend requests. Try again later.",
          code: "RATE_LIMITED",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
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

    const { error: resendError } = await deliverSignupVerificationOtp(
      supabase,
      email,
      "signin_otp",
    );

    if (resendError) {
      return jsonResponseWithCookies(
        { error: "Failed to resend code. Try again." },
        pendingCookies,
        { status: 500 },
      );
    }

    await recordOtpSent(serviceDb, email);

    await logOtpEvent(serviceDb, {
      email,
      eventType: "otp_resent",
      userId: userLookup.id,
      ipAddress: ip,
      userAgent,
      sessionFingerprint,
    });

    await logSecurityEvent(serviceDb, {
      eventType: "signup_otp_resent",
      email,
      userId: userLookup.id,
      ipAddress: ip,
      userAgent,
      sessionFingerprint,
      details: { maskedEmail: maskEmail(email) },
    });

    return jsonResponseWithCookies(
      {
        success: true,
        email: maskEmail(email),
        expiresIn: OTP_CONFIG.EXPIRY_MINUTES * 60,
        cooldownSeconds: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
      },
      pendingCookies,
    );
  } catch (err) {
    console.error("[verify-email/resend]", err);
    return jsonResponseWithCookies(
      { error: "Unable to resend code. Check your connection." },
      pendingCookies,
      { status: 500 },
    );
  }
}
