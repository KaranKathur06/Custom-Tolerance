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

    const originalApprovalStatus = product.approval_status;

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

    const { error: productError } = await supabase
      .from("seller_products")
      .update({ approval_status: "pending_review", updated_at: new Date().toISOString() })
      .eq("id", productId)
      .eq("profile_id", user.id);

    if (productError) {
      return NextResponse.json(
        { error: productError.message || "Failed to submit product for review" },
        { status: 500 },
      );
    }

    // Create approval record
    const { error: approvalError } = await supabase
      .from("product_approvals")
      .insert({
        seller_product_id: productId,
        submitted_by: user.id,
        status: "pending",
      });

    if (approvalError) {
      console.error("[publish] Approval record creation failed:", approvalError);
      await supabase
        .from("seller_products")
        .update({ approval_status: originalApprovalStatus, updated_at: new Date().toISOString() })
        .eq("id", productId)
        .eq("profile_id", user.id);
      return NextResponse.json(
        { error: approvalError.message || "Failed to create approval request" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product submitted for marketplace approval",
      approval_status: "pending_review",
    });
  } catch (err: any) {
    console.error("[publish]", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
