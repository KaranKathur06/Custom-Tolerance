/**
 * GET /api/dashboard/seller/stats — Seller dashboard aggregates
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

function listingBucket(item: {
  is_active: boolean | null;
  moderation_status: string | null;
}): string {
  const mod = item.moderation_status ?? "pending";
  if (mod === "rejected") return "rejected";
  if (mod === "pending" || mod === "in_review") return "pending";
  if (mod === "approved" && item.is_active) return "active";
  if (mod === "approved" && !item.is_active) return "paused";
  return "draft";
}

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data: sellerProfile } = await auth.supabase
    .from("seller_profiles")
    .select("id, profile_completion_percent, trust_level, verification_status, company_id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json({
      success: true,
      data: {
        hasSellerProfile: false,
        listings: { total: 0, draft: 0, pending: 0, active: 0, paused: 0, rejected: 0 },
        inquiries: { total: 0, unread: 0 },
        quotes: { submitted: 0, viewed: 0, shortlisted: 0, won: 0, lost: 0 },
        leadFeedCount: 0,
        profileHealth: 0,
        unreadNotifications: 0,
        products: { total: 0, draft: 0, published: 0, pending_review: 0, rejected: 0 },
      },
    });
  }

  const { data: marketplaceSupplier } = await auth.supabase
    .from("suppliers")
    .select("id")
    .eq("seller_profile_id", sellerProfile.id)
    .maybeSingle();

  const [
    listingsRes,
    quotesRes,
    notificationsRes,
    productsRes,
  ] = await Promise.all([
    auth.supabase
      .from("listings")
      .select("id, is_active, moderation_status, views_count, inquiry_count")
      .eq("seller_profile_id", sellerProfile.id)
      .is("deleted_at", null),
    auth.supabase
      .from("quotes")
      .select("id, status")
      .eq("seller_profile_id", sellerProfile.id)
      .is("deleted_at", null),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", auth.user.id)
      .is("read_at", null)
      .is("deleted_at", null),
    auth.supabase
      .from("seller_products")
      .select("id, approval_status, is_published")
      .eq("seller_profile_id", sellerProfile.id),
  ]);

  const listings = listingsRes.data ?? [];
  const listingCounts = { total: listings.length, draft: 0, pending: 0, active: 0, paused: 0, rejected: 0 };
  let totalViews = 0;
  let listingInquiries = 0;

  for (const item of listings) {
    const bucket = listingBucket(item);
    listingCounts[bucket as keyof typeof listingCounts] += 1;
    totalViews += item.views_count ?? 0;
    listingInquiries += item.inquiry_count ?? 0;
  }

  // Product stats
  const products = productsRes.data ?? [];
  const productCounts = {
    total: products.length,
    draft: products.filter((p) => p.approval_status === "draft").length,
    published: products.filter((p) => p.is_published).length,
    pending_review: products.filter((p) => p.approval_status === "pending_review").length,
    rejected: products.filter((p) => p.approval_status === "rejected").length,
  };

  let inquiryTotal = 0;
  let inquiryUnread = 0;

  if (marketplaceSupplier?.id) {
    const { data: inquiries, count } = await auth.supabase
      .from("inquiries")
      .select("id, is_read", { count: "exact" })
      .eq("supplier_id", marketplaceSupplier.id)
      .order("created_at", { ascending: false })
      .limit(100);

    inquiryTotal = count ?? inquiries?.length ?? 0;
    inquiryUnread = inquiries?.filter((i) => !i.is_read).length ?? 0;
  }

  const quotes = quotesRes.data ?? [];
  const quotePipeline = {
    submitted: quotes.filter((q) => q.status === "submitted").length,
    viewed: quotes.filter((q) => q.status === "viewed").length,
    shortlisted: quotes.filter((q) => q.status === "shortlisted").length,
    won: quotes.filter((q) => q.status === "accepted").length,
    lost: quotes.filter((q) => ["rejected", "withdrawn", "expired"].includes(q.status)).length,
  };

  let leadFeedCount = 0;
  if (marketplaceSupplier?.id) {
    const { data: leads } = await auth.supabase.rpc("match_rfqs_to_supplier", {
      target_supplier_id: marketplaceSupplier.id,
      max_results: 20,
    });
    leadFeedCount = leads?.length ?? 0;
  }

  return NextResponse.json({
    success: true,
    data: {
      hasSellerProfile: true,
      supplierId: marketplaceSupplier?.id ?? null,
      listings: { ...listingCounts, totalViews, listingInquiries },
      inquiries: { total: inquiryTotal, unread: inquiryUnread },
      quotes: quotePipeline,
      leadFeedCount,
      profileHealth: sellerProfile.profile_completion_percent ?? 0,
      trustLevel: sellerProfile.trust_level ?? 0,
      verificationStatus: sellerProfile.verification_status,
      unreadNotifications: notificationsRes.count ?? 0,
      products: productCounts,
    },
  });
}
