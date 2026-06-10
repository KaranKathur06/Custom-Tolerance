/**
 * GET /api/dashboard/seller/leads — Capability-matched RFQ feed for seller
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(30, parseInt(searchParams.get("limit") || "20", 10));

  const { data: sellerProfile } = await auth.supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json(
      { success: false, error: { code: "SELLER_PROFILE_REQUIRED", message: "Complete seller onboarding" } },
      { status: 400 },
    );
  }

  const { data: supplier } = await auth.supabase
    .from("suppliers")
    .select("id")
    .eq("seller_profile_id", sellerProfile.id)
    .maybeSingle();

  if (!supplier?.id) {
    return NextResponse.json({
      success: true,
      data: [],
      meta: { message: "Publish your supplier profile to receive matched leads" },
    });
  }

  const { data: leads, error } = await auth.supabase.rpc("match_rfqs_to_supplier", {
    target_supplier_id: supplier.id,
    max_results: limit,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: leads ?? [] });
}
