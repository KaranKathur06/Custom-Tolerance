/**
 * POST /api/dashboard/seller/products/[id]/publish
 * Publish a seller product to marketplace with approval workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canPublishProductDraft, getCurrentProductPhase } from "@/lib/services/product-draft-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  try {
    // Verify ownership
    const { data: product, error: fetchError } = await supabase
      .from("seller_products")
      .select("*")
      .eq("id", productId)
      .eq("profile_id", user.id)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { error: "Product not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({})) as { expectedVersion?: number };
    const expectedVersion = Number(body.expectedVersion ?? product.draft_version ?? 1);

    const phase = getCurrentProductPhase({
      productName: product.product_name,
      priceType: product.price_type,
      description: product.description,
      moq: product.moq,
      leadTime: product.lead_time,
    });
    const publishCheck = canPublishProductDraft({
      id: product.id,
      status: product.approval_status,
      productName: product.product_name,
      phase,
    });

    if (!publishCheck) {
      return NextResponse.json(
        { error: "Complete the product name, pricing, description, MOQ, and lead time before submitting." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("submit_seller_product_for_review", {
      p_product_id: productId,
      p_expected_version: expectedVersion,
    });
    if (error) {
      const code = error.message.includes("CONFLICT_STALE_DRAFT")
        ? "CONFLICT_STALE_DRAFT"
        : error.message.includes("PRODUCT_NOT_SUBMITTABLE")
          ? "PRODUCT_NOT_SUBMITTABLE"
          : "PRODUCT_SUBMISSION_FAILED";
      return NextResponse.json(
        { success: false, error: { code, message: code === "CONFLICT_STALE_DRAFT" ? "This product changed in another session. Refresh and try again." : "This product cannot be submitted in its current state." } },
        { status: code === "CONFLICT_STALE_DRAFT" ? 409 : 422 },
      );
    }
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      message: "Product submitted for marketplace approval",
      product: result,
    });
  } catch (err: any) {
    console.error("[publish]", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
