/**
 * GET /api/dashboard/buyer/quotes — Active quotes on buyer's RFQs
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
  const rfqId = searchParams.get("rfq_id");

  const { data: buyerProfile } = await auth.supabase
    .from("buyer_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  let rfqQuery = auth.supabase.from("rfqs").select("id, title, slug, status");

  if (buyerProfile?.id) {
    rfqQuery = rfqQuery.eq("buyer_profile_id", buyerProfile.id);
  } else {
    rfqQuery = rfqQuery.eq("buyer_user_id", auth.user.id);
  }

  if (rfqId) {
    rfqQuery = rfqQuery.eq("id", rfqId);
  } else {
    rfqQuery = rfqQuery.in("status", ["open", "in_review", "quoted"]);
  }

  const { data: rfqs, error: rfqError } = await rfqQuery.order("created_at", { ascending: false });

  if (rfqError) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: rfqError.message } },
      { status: 500 },
    );
  }

  const rfqIds = (rfqs ?? []).map((r) => r.id);
  if (!rfqIds.length) {
    return NextResponse.json({ success: true, data: [] });
  }

  const { data: quotes, error: quotesError } = await auth.supabase
    .from("quotes")
    .select(
      `
      id, price, moq, lead_time, payment_terms, status, submitted_at, viewed_at, shortlisted_at,
      rfq_id,
      seller_profiles:seller_profile_id(
        id, company_name, verification_status, trust_level,
        profiles:profile_id(full_name)
      )
    `,
    )
    .in("rfq_id", rfqIds)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  if (quotesError) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: quotesError.message } },
      { status: 500 },
    );
  }

  const grouped = (rfqs ?? []).map((rfq) => ({
    rfq,
    quotes: (quotes ?? [])
      .filter((q) => q.rfq_id === rfq.id)
      .map((q) => {
        const sellerRaw = q.seller_profiles;
        const seller = Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw;
        const profileRaw = seller?.profiles;
        const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
        return {
          id: q.id,
          price: q.price,
          moq: q.moq,
          lead_time: q.lead_time,
          payment_terms: q.payment_terms,
          status: q.status,
          submitted_at: q.submitted_at,
          seller_profiles: seller,
          supplier: seller
            ? {
                company_name: seller.company_name ?? profile?.full_name ?? "Supplier",
                verification_status:
                  seller.verification_status === "approved" ? "verified" : seller.verification_status,
                review_avg: 0,
              }
            : null,
        };
      }),
  }));

  return NextResponse.json({ success: true, data: grouped });
}
