import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  maskMobile,
  normalizeMobileNumber,
  verifyMobileOtp,
} from "@/lib/auth/mobile-verification";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { mobileNumber?: string; countryCode?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mobile = normalizeMobileNumber(body.mobileNumber ?? "", body.countryCode ?? "+91");
  const otp = String(body.otp ?? "").replace(/\D/g, "");

  if (!mobile) {
    return NextResponse.json({ error: "Enter a valid mobile number." }, { status: 422 });
  }

  if (otp.length !== 6) {
    return NextResponse.json({ error: "Enter the complete 6-digit OTP." }, { status: 422 });
  }

  try {
    const result = await verifyMobileOtp({ supabase, userId: user.id, mobile, otp });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
    }

    await supabase
      .from("profiles")
      .update({ phone: mobile.e164 })
      .eq("id", user.id);

    return NextResponse.json({
      status: "verified",
      verified: true,
      maskedMobile: maskMobile(mobile),
      verifiedAt: result.record.verified_at,
      message: "Mobile Verified Successfully",
    });
  } catch (error) {
    console.error("[Mobile OTP] Verify failed:", error);
    return NextResponse.json({ error: "Failed to verify mobile OTP." }, { status: 500 });
  }
}
