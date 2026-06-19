import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  deriveMobileVerificationStatus,
  getMobileVerificationRecord,
  maskMobile,
  normalizeMobileNumber,
  secondsUntil,
} from "@/lib/auth/mobile-verification";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const mobile = normalizeMobileNumber(
    url.searchParams.get("mobileNumber") ?? "",
    url.searchParams.get("countryCode") ?? "+91",
  );

  if (!mobile) {
    return NextResponse.json({
      status: "pending",
      verified: false,
      maskedMobile: "",
      cooldownSeconds: 0,
      expiresInSeconds: 0,
      remainingAttempts: 5,
      resendCount: 0,
    });
  }

  const record = await getMobileVerificationRecord(supabase, user.id, mobile);
  const status = deriveMobileVerificationStatus(record);

  return NextResponse.json({
    status,
    verified: status === "verified",
    maskedMobile: maskMobile(mobile),
    verifiedAt: record?.verified_at ?? null,
    cooldownSeconds: status === "otp_sent" ? 60 : 0,
    expiresInSeconds: secondsUntil(record?.otp_expires_at ?? null),
    remainingAttempts: Math.max(0, 5 - (record?.attempt_count ?? 0)),
    resendCount: record?.resend_count ?? 0,
  });
}
