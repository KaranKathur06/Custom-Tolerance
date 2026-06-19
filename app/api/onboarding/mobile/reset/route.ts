import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  normalizeMobileNumber,
  resetMobileVerification,
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

  let body: { mobileNumber?: string; countryCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mobile = normalizeMobileNumber(body.mobileNumber ?? "", body.countryCode ?? "+91");
  if (mobile) {
    await resetMobileVerification({ supabase, userId: user.id, mobile });
  }

  return NextResponse.json({
    status: "pending",
    verified: false,
    message: "Mobile verification reset.",
  });
}
