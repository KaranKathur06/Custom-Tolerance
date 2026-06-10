import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import {
  generateOTP,
  hashOTP,
  verifyOTPHash,
  getOTPExpiry,
  getMaxOTPAttempts,
  OTP_PURPOSES,
  isValidOTPPurpose,
} from "@/lib/auth/otp";
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: { code: "DB_UNAVAILABLE", message: "Database unavailable" } }, { status: 503 });
  }

  const body = await request.json();
  const action = body.action as "send" | "verify";
  const purpose = body.purpose as string;
  const target = body.target as string;

  if (!isValidOTPPurpose(purpose) || purpose === OTP_PURPOSES.ADMIN_2FA) {
    return NextResponse.json({ success: false, error: { code: "INVALID_PURPOSE", message: "Invalid OTP purpose" } }, { status: 400 });
  }

  if (purpose !== OTP_PURPOSES.MOBILE_VERIFICATION && purpose !== OTP_PURPOSES.EMAIL_VERIFICATION) {
    return NextResponse.json({ success: false, error: { code: "INVALID_PURPOSE", message: "Only contact verification OTPs are supported" } }, { status: 400 });
  }

  const db = createSupabaseServiceRoleClient() ?? supabase;
  const rateCheck = await checkRateLimit(
    db,
    user.id,
    RATE_LIMITS.OTP_SEND.action,
    RATE_LIMITS.OTP_SEND.maxAttempts,
    RATE_LIMITS.OTP_SEND.windowMinutes,
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many OTP requests. Try again later." } },
      { status: 429 },
    );
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id, company_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (action === "send") {
    if (!target?.trim()) {
      return NextResponse.json({ success: false, error: { code: "MISSING_TARGET", message: "Target email or phone required" } }, { status: 400 });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry();

    await supabase.from("otp_verifications").insert({
      user_id: user.id,
      email: purpose === OTP_PURPOSES.EMAIL_VERIFICATION ? target.trim() : (user.email ?? target.trim()),
      purpose,
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
      max_attempts: getMaxOTPAttempts(),
    });

    if (sellerProfile) {
      await supabase.from("supplier_verifications").upsert(
        {
          seller_profile_id: sellerProfile.id,
          profile_id: user.id,
          verification_type: purpose === OTP_PURPOSES.MOBILE_VERIFICATION ? "mobile" : "email",
          target_value: target.trim(),
          otp_hash: otpHash,
          otp_expires_at: expiresAt.toISOString(),
          attempt_count: 0,
          is_verified: false,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "seller_profile_id,verification_type" },
      );
    }

    // In production, send via email/SMS service. Return OTP only in development.
    const isDev = process.env.NODE_ENV === "development";

    return NextResponse.json({
      success: true,
      data: {
        sent: true,
        expiresAt: expiresAt.toISOString(),
        ...(isDev ? { devOtp: otp } : {}),
      },
    });
  }

  const submittedOtp = body.otp as string;
  if (!submittedOtp?.trim()) {
    return NextResponse.json({ success: false, error: { code: "MISSING_OTP", message: "OTP required" } }, { status: 400 });
  }

  const { data: verification } = await supabase
    .from("supplier_verifications")
    .select("*")
    .eq("profile_id", user.id)
    .eq("verification_type", purpose === OTP_PURPOSES.MOBILE_VERIFICATION ? "mobile" : "email")
    .maybeSingle();

  if (!verification?.otp_hash) {
    return NextResponse.json({ success: false, error: { code: "NO_OTP", message: "No OTP found. Request a new one." } }, { status: 400 });
  }

  if (verification.otp_expires_at && new Date(verification.otp_expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: { code: "OTP_EXPIRED", message: "OTP expired. Request a new one." } }, { status: 400 });
  }

  if ((verification.attempt_count ?? 0) >= getMaxOTPAttempts()) {
    return NextResponse.json({ success: false, error: { code: "MAX_ATTEMPTS", message: "Maximum attempts exceeded." } }, { status: 400 });
  }

  const valid = verifyOTPHash(submittedOtp.trim(), verification.otp_hash);

  await supabase
    .from("supplier_verifications")
    .update({
      attempt_count: (verification.attempt_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", verification.id);

  if (!valid) {
    return NextResponse.json({ success: false, error: { code: "INVALID_OTP", message: "Invalid OTP." } }, { status: 400 });
  }

  await supabase
    .from("supplier_verifications")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      status: "verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", verification.id);

  if (purpose === OTP_PURPOSES.MOBILE_VERIFICATION && sellerProfile?.company_id) {
    await supabase.from("companies").update({ phone_verified: true }).eq("id", sellerProfile.company_id);
    await supabase.from("profiles").update({ phone: verification.target_value }).eq("id", user.id);
  }

  if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION && sellerProfile?.company_id) {
    await supabase.from("companies").update({ email_verified: true }).eq("id", sellerProfile.company_id);
  }

  return NextResponse.json({ success: true, data: { verified: true } });
}
