/**
 * GET /api/dashboard/seller/products — List seller products with publishing status
 * POST /api/dashboard/seller/products — Create a new product using atomic RPC
 * PATCH /api/dashboard/seller/products — Update a product
 * DELETE /api/dashboard/seller/products — Delete a product
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/seller/products
// Returns all products for the authenticated seller with publishing status
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!sellerProfile) {
    return NextResponse.json({ products: [] });
  }

  const { data: products, error } = await supabase
    .from("seller_products")
    .select(
      `
      id, product_name, price_type, currency, price_unit, min_price, max_price,
      description, country_of_origin, third_party_inspection, free_sample, sample_shipping_cost,
      delivery_terms, weight_value, weight_unit, dim_length, dim_width, dim_height, dim_unit,
      shipping_type, primary_packaging, secondary_packaging, packaging_notes,
      quality_certificate, brand_marking, brand_marking_other, dies_and_tools,
      estimated_tool_cost, tool_ownership, tool_lead_time, specification,
      monthly_capacity, production_capacity_unit, moq, lead_time,
      is_visible, is_featured, is_published, published_at, listing_id, approval_status,
      created_at, updated_at,
      product_approvals(id, status, created_at, rejection_reason, notes),
      product_images(url, storage_path, is_primary),
      product_capabilities(capability_id),
      product_industries(industry_id),
      product_materials(material_name),
      product_grades(grade_name),
      product_payment_terms(payment_term_id),
      product_incoterms(incoterm_id)
      `
    )
    .eq("seller_profile_id", sellerProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[seller/products]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    products: products ?? [],
    total: products?.length || 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/dashboard/seller/products
// Creates a new product draft using the atomic RPC
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  const { data: productId, error } = await supabase.rpc(
    "initialize_product_draft",
    {
      p_product_name: String(body.productName ?? "Draft Product"),
      p_is_visible: Boolean(body.isVisible ?? false),
    }
  );

  if (error) {
    console.error("[seller/products POST]", error.message);
    if (error.message.includes("SELLER_PROFILE_INCOMPLETE")) {
      return NextResponse.json(
        {
          code: "SELLER_PROFILE_INCOMPLETE",
          message: "Complete seller onboarding before creating products.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: { id: productId } }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/seller/products
// Updates a product and its related tables
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("id");
  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const body = (await req.json()) as Record<string, any>;

  // 1. Update the main table
  const patch: Record<string, any> = {};
  
  if (body.productName !== undefined) patch.product_name = String(body.productName);
  if (body.priceType !== undefined) patch.price_type = body.priceType;
  if (body.currency !== undefined) patch.currency = body.currency;
  if (body.priceUnit !== undefined) patch.price_unit = body.priceUnit;
  if (body.minPrice !== undefined) patch.min_price = Number(body.minPrice) || null;
  if (body.maxPrice !== undefined) patch.max_price = Number(body.maxPrice) || null;
  if (body.description !== undefined) patch.description = body.description;
  if (body.countryOfOrigin !== undefined) patch.country_of_origin = body.countryOfOrigin;
  if (body.thirdPartyInspection !== undefined) patch.third_party_inspection = body.thirdPartyInspection === 'yes';
  if (body.freeSample !== undefined) patch.free_sample = body.freeSample === 'yes';
  if (body.sampleShippingCost !== undefined) patch.sample_shipping_cost = body.sampleShippingCost;
  if (body.deliveryTerms !== undefined) patch.delivery_terms = body.deliveryTerms;
  if (body.weightValue !== undefined) patch.weight_value = Number(body.weightValue) || null;
  if (body.weightUnit !== undefined) patch.weight_unit = body.weightUnit;
  if (body.dimLength !== undefined) patch.dim_length = Number(body.dimLength) || null;
  if (body.dimWidth !== undefined) patch.dim_width = Number(body.dimWidth) || null;
  if (body.dimHeight !== undefined) patch.dim_height = Number(body.dimHeight) || null;
  if (body.dimUnit !== undefined) patch.dim_unit = body.dimUnit;
  if (body.shippingType !== undefined) patch.shipping_type = body.shippingType;
  if (body.primaryPackaging !== undefined) patch.primary_packaging = body.primaryPackaging;
  if (body.secondaryPackaging !== undefined) patch.secondary_packaging = body.secondaryPackaging;
  if (body.packagingNotes !== undefined) patch.packaging_notes = body.packagingNotes;
  if (body.qualityCertificate !== undefined) patch.quality_certificate = body.qualityCertificate;
  if (body.brandMarking !== undefined) patch.brand_marking = body.brandMarking;
  if (body.brandMarkingOther !== undefined) patch.brand_marking_other = body.brandMarkingOther;
  if (body.diesAndTools !== undefined) patch.dies_and_tools = body.diesAndTools;
  if (body.estimatedToolCost !== undefined) patch.estimated_tool_cost = Number(body.estimatedToolCost) || null;
  if (body.toolOwnership !== undefined) patch.tool_ownership = body.toolOwnership;
  if (body.toolLeadTime !== undefined) patch.tool_lead_time = body.toolLeadTime;
  if (body.specification !== undefined) patch.specification = body.specification;
  
  // Backwards compat / standard
  if (body.productionCapacity !== undefined) patch.monthly_capacity = body.productionCapacity;
  if (body.productionCapacityUnit !== undefined) patch.production_capacity_unit = body.productionCapacityUnit;
  if (body.moq !== undefined) patch.moq = body.moq;
  if (body.leadTime !== undefined) patch.lead_time = body.leadTime;
  if (body.tolerance !== undefined) patch.tolerance_capability = body.tolerance;
  
  if (body.isFeatured !== undefined) patch.is_featured = Boolean(body.isFeatured);
  if (body.isVisible !== undefined) patch.is_visible = Boolean(body.isVisible);
  patch.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("seller_products")
    .update(patch)
    .eq("id", productId)
    .eq("profile_id", user.id);

  if (updateError) {
    console.error("[seller/products PATCH] update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 2. Update related many-to-many tables if provided
  // In a real production app we'd do this via a transaction RPC.
  // For PIM drafts, deleting and re-inserting is a standard autosave pattern.
  
  const handleRelation = async (table: string, field: string, items: any[]) => {
    if (!items) return;
    await supabase.from(table).delete().eq("seller_product_id", productId);
    if (items.length > 0) {
      const inserts = items.map(item => ({ seller_product_id: productId, [field]: item }));
      await supabase.from(table).insert(inserts);
    }
  };

  await Promise.all([
    body.capabilities && handleRelation("product_capabilities", "capability_id", body.capabilities),
    body.industries && handleRelation("product_industries", "industry_id", body.industries),
    body.materials && handleRelation("product_materials", "material_name", body.materials),
    body.grades && handleRelation("product_grades", "grade_name", body.grades),
    body.paymentTerms && handleRelation("product_payment_terms", "payment_term_id", body.paymentTerms),
    body.incoterms && handleRelation("product_incoterms", "incoterm_id", body.incoterms),
  ]);

  // Handle images specifically since it requires multiple fields
  if (body.images && Array.isArray(body.images)) {
    await supabase.from("product_images").delete().eq("seller_product_id", productId);
    if (body.images.length > 0) {
      const inserts = body.images.map((img: any, idx: number) => ({
        seller_product_id: productId,
        url: img.url,
        storage_path: img.path,
        is_primary: img.isPrimary || false,
        display_order: idx
      }));
      await supabase.from("product_images").insert(inserts);
    }
  }

  return NextResponse.json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/dashboard/seller/products
// Deletes a product by id (passed as query param ?id=...)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("id");
  if (!productId) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const { data: product } = await supabase
    .from("seller_products")
    .select("is_published, approval_status")
    .eq("id", productId)
    .eq("profile_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
  }

  if (product.is_published || product.approval_status === "approved") {
    return NextResponse.json({ error: "Cannot delete published or approved products" }, { status: 400 });
  }

  const { error } = await supabase
    .from("seller_products")
    .delete()
    .eq("id", productId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
