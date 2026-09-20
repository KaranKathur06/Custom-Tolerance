import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import {
  createOrUpdateMobileOtp,
  deriveMobileVerificationStatus,
  maskMobile,
  normalizeMobileNumber,
  secondsUntil,
} from "@/lib/auth/mobile-verification";

export async function POST(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  let body: { mobileNumber?: string; countryCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mobile = normalizeMobileNumber(body.mobileNumber ?? "", body.countryCode ?? "+91");
  if (!mobile) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 422 });
  }

  try {
    const result = await createOrUpdateMobileOtp({ supabase, user, mobile, request });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code, retryAfterSeconds: result.retryAfterSeconds ?? null },
        { status: result.status },
      );
    }

    return NextResponse.json({
      status: deriveMobileVerificationStatus(result.record),
      verified: false,
      maskedMobile: maskMobile(mobile),
      expiresInSeconds: secondsUntil(result.record.otp_expires_at),
      cooldownSeconds: 60,
      remainingAttempts: 5,
      resendCount: result.record.resend_count,
      delivery: result.delivery,
      developmentOtp: result.developmentOtp,
    });
  } catch (error) {
    console.error("[Mobile OTP] Send failed:", error);
    return NextResponse.json({ error: "Failed to send mobile OTP." }, { status: 500 });
  }
}
