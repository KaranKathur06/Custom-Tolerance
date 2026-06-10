/**
 * GET  /api/suppliers/[id]/reviews — Public paginated reviews
 * POST /api/suppliers/[id]/reviews — Submit review (authenticated buyer, completed transaction)
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  loadSupplierReviews,
  loadSupplierReviewStats,
} from "@/lib/marketplace/supplier-profile-extended";

type RouteParams = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveSupplierId(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  idOrSlug: string,
): Promise<string | null> {
  if (UUID_RE.test(idOrSlug)) return idOrSlug;

  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("slug", idOrSlug)
    .eq("is_published", true)
    .maybeSingle();

  return data?.id ?? null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Service unavailable" } },
      { status: 503 },
    );
  }

  const supplierId = await resolveSupplierId(supabase, id);
  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(20, parseInt(searchParams.get("limit") || "5", 10));

  const [{ reviews, total }, stats] = await Promise.all([
    loadSupplierReviews(supabase, supplierId, page, limit),
    loadSupplierReviewStats(supabase, supplierId),
  ]);

  return NextResponse.json({
    success: true,
    data: { reviews, total, stats, page, limit },
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const supplierId = await resolveSupplierId(auth.supabase, id);
  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  const quoteId = typeof body.quote_id === "string" ? body.quote_id : null;
  const overallRating = typeof body.overall_rating === "number" ? body.overall_rating : null;

  if (!quoteId || !overallRating || overallRating < 1 || overallRating > 5) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "quote_id and overall_rating (1-5) are required",
        },
      },
      { status: 400 },
    );
  }

  const { data: quote } = await auth.supabase
    .from("quotes")
    .select("id, status, rfq_id, seller_profile_id")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote || quote.status !== "accepted") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_ELIGIBLE",
          message: "Reviews are only allowed after quote acceptance",
        },
      },
      { status: 403 },
    );
  }

  const { data: review, error } = await auth.supabase
    .from("reviews")
    .insert({
      supplier_id: supplierId,
      reviewer_id: auth.user.id,
      quote_id: quoteId,
      rfq_id: quote.rfq_id,
      overall_rating: overallRating,
      quality_rating: typeof body.quality_rating === "number" ? body.quality_rating : null,
      delivery_rating: typeof body.delivery_rating === "number" ? body.delivery_rating : null,
      communication_rating:
        typeof body.communication_rating === "number" ? body.communication_rating : null,
      pricing_rating: typeof body.pricing_rating === "number" ? body.pricing_rating : null,
      title: typeof body.title === "string" ? body.title.trim() : null,
      body: typeof body.body === "string" ? body.body.trim() : null,
      is_verified_purchase: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "You already reviewed this transaction" } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await auth.supabase.from("platform_events").insert({
    event_type: "review.added",
    actor_id: auth.user.id,
    actor_role: auth.role,
    resource_type: "review",
    resource_id: review.id,
    metadata: { supplier_id: supplierId, quote_id: quoteId },
  });

  return NextResponse.json({ success: true, data: { id: review.id } }, { status: 201 });
}
