/**
 * GET /api/dashboard/buyer/stats — Buyer dashboard aggregates
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data: buyerProfile } = await auth.supabase
    .from("buyer_profiles")
    .select("id, profile_completion_percent, trust_level")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  let rfqQuery = auth.supabase.from("rfqs").select("id, status", { count: "exact" });

  if (buyerProfile?.id) {
    rfqQuery = rfqQuery.eq("buyer_profile_id", buyerProfile.id);
  } else {
    rfqQuery = rfqQuery.eq("buyer_user_id", auth.user.id);
  }

  const [
    rfqsRes,
    savedRes,
    notificationsRes,
    profileRes,
  ] = await Promise.all([
    rfqQuery,
    auth.supabase
      .from("saved_suppliers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", auth.user.id)
      .is("read_at", null)
      .is("deleted_at", null),
    auth.supabase
      .from("profiles")
      .select("full_name, phone, profile_status, email")
      .eq("id", auth.user.id)
      .maybeSingle(),
  ]);

  const rfqIds = (rfqsRes.data ?? []).map((r) => r.id);
  const openRfqs = (rfqsRes.data ?? []).filter((r) =>
    ["open", "in_review", "quoted"].includes(r.status),
  ).length;
  const closedRfqs = (rfqsRes.data ?? []).filter((r) =>
    ["closed", "cancelled"].includes(r.status),
  ).length;

  let quotesReceived = 0;
  let activeQuotes = 0;

  if (rfqIds.length > 0) {
    const { data: quotes } = await auth.supabase
      .from("quotes")
      .select("id, status, rfq_id")
      .in("rfq_id", rfqIds)
      .is("deleted_at", null);

    quotesReceived = quotes?.length ?? 0;
    activeQuotes =
      quotes?.filter((q) => !["rejected", "withdrawn", "expired"].includes(q.status)).length ?? 0;
  }

  const profileCompletion = buyerProfile?.profile_completion_percent ?? 0;
  const profileChecks = [
    Boolean(profileRes.data?.full_name),
    Boolean(profileRes.data?.phone),
    Boolean(auth.user.email_confirmed_at),
    Boolean(buyerProfile?.id),
    profileCompletion >= 50,
  ];
  const computedCompletion = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );

  return NextResponse.json({
    success: true,
    data: {
      rfqCount: rfqsRes.count ?? 0,
      openRfqs,
      closedRfqs,
      quotesReceived,
      activeQuotes,
      savedSuppliers: savedRes.count ?? 0,
      unreadNotifications: notificationsRes.count ?? 0,
      profileCompletion: Math.max(profileCompletion, computedCompletion),
      trustLevel: buyerProfile?.trust_level ?? 0,
    },
  });
}
