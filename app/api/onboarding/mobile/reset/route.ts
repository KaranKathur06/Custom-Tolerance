import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import {
  normalizeMobileNumber,
  resetMobileVerification,
} from "@/lib/auth/mobile-verification";

export async function POST(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  let body: { mobileNumber?: string; countryCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mobile = normalizeMobileNumber(body.mobileNumber ?? "", body.countryCode ?? "+91");
  if (mobile) {
    await resetMobileVerification({ supabase: auth.supabase, userId: auth.user.id, mobile });
  }

  return NextResponse.json({
    status: "pending",
    verified: false,
    message: "Mobile verification reset.",
  });
}
