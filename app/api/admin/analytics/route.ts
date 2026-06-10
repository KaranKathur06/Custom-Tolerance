/**
 * GET /api/admin/analytics — Platform procurement KPIs
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_ANALYTICS],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    rfqsTotal,
    rfqsMonth,
    quotesTotal,
    quotesSubmitted,
    quotesAccepted,
    suppliersTotal,
    suppliersVerified,
    buyersTotal,
    reviewsTotal,
    platformEvents,
  ] = await Promise.all([
    auth.supabase.from("rfqs").select("id", { count: "exact", head: true }),
    auth.supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    auth.supabase.from("quotes").select("id", { count: "exact", head: true }).is("deleted_at", null),
    auth.supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .neq("status", "draft")
      .is("deleted_at", null),
    auth.supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .is("deleted_at", null),
    auth.supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_published", true),
    auth.supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .not("gst_verified_at", "is", null),
    auth.supabase.from("buyer_profiles").select("id", { count: "exact", head: true }),
    auth.supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_published", true),
    auth.supabase
      .from("platform_events")
      .select("event_type")
      .gte("created_at", monthStart.toISOString()),
  ]);

  const eventCounts: Record<string, number> = {};
  for (const row of platformEvents.data ?? []) {
    eventCounts[row.event_type] = (eventCounts[row.event_type] ?? 0) + 1;
  }

  const rfqCount = rfqsTotal.count ?? 0;
  const quoteCount = quotesSubmitted.count ?? 0;
  const acceptedCount = quotesAccepted.count ?? 0;

  const responseRate =
    rfqCount > 0 ? Math.round(((quotesTotal.count ?? 0) / rfqCount) * 100) : 0;
  const conversionRate =
    quoteCount > 0 ? Math.round((acceptedCount / quoteCount) * 100) : 0;
  const gstVerifiedRate =
    (suppliersTotal.count ?? 0) > 0
      ? Math.round(((suppliersVerified.count ?? 0) / (suppliersTotal.count ?? 1)) * 100)
      : 0;

  return NextResponse.json({
    success: true,
    data: {
      rfqsPosted: rfqCount,
      rfqsThisMonth: rfqsMonth.count ?? 0,
      quotesSent: quoteCount,
      quotesAccepted: acceptedCount,
      responseRate,
      conversionRate,
      activeSuppliers: suppliersTotal.count ?? 0,
      gstVerifiedSuppliers: suppliersVerified.count ?? 0,
      gstVerifiedRate,
      activeBuyers: buyersTotal.count ?? 0,
      reviewsPublished: reviewsTotal.count ?? 0,
      eventCounts,
      revenue: null,
      revenueNote: "Revenue sync requires Razorpay configuration",
    },
  });
}
