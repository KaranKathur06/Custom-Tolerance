/**
 * GET /api/admin/otp/bypass/status
 * Returns whether the current user has active Super Admin OTP bypass.
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { resolveEffectiveRole } from "@/lib/auth/rbac";
import {
  isSuperAdminOtpBypassEligible,
  isSuperAdminOtpBypassEnabled,
} from "@/lib/auth/admin-otp-bypass";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ bypassActive: false, bypassEnabled: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ bypassActive: false, bypassEnabled: isSuperAdminOtpBypassEnabled() });
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

  const eligible = isSuperAdminOtpBypassEligible(user.email, role);

  return NextResponse.json({
    bypassEnabled: isSuperAdminOtpBypassEnabled(),
    bypassEligible: eligible,
    bypassActive: eligible,
    showBanner: eligible,
  });
}
