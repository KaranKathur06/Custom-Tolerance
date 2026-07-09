/**
 * POST /api/dashboard/seller/products/[id]/publish
 * Publish a seller product to marketplace with approval workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Call the publishing function
    const { data: result, error: pubError } = await supabase.rpc(
      "publish_product_to_marketplace",
      {
        p_seller_product_id: productId,
      }
    );

    if (pubError) {
      return NextResponse.json(
        { error: pubError.message || "Failed to publish product" },
        { status: 500 }
      );
    }

    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || "Publishing failed" },
        { status: 400 }
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
    }

    return NextResponse.json({
      success: true,
      message: "Product submitted for marketplace approval",
      listing_id: result?.listing_id,
      approval_status: "pending",
    });
  } catch (err: any) {
    console.error("[publish]", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
