import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    requiredRoles: ["admin", "super_admin", "supplier_success", "moderator"],
    requireAdmin2FA: true,
  });

  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("seller_profiles")
    .select(`
      id,
      profile_id,
      company_id,
      onboarding_status,
      profile_completion_percent,
      verification_status,
      submitted_at,
      created_at,
      change_request_notes,
      companies (
        id, name, slug, gst_number, business_type, verification_status
      ),
      profiles (
        id, full_name, email, phone
      ),
      supplier_trust_scores (
        trust_score, total_score
      )
    `)
    .in("onboarding_status", ["PROFILE_SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"])
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: { code: "QUERY_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
