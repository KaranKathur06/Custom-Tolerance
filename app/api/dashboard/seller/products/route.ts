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

  const { data: baseProducts, error } = await supabase
    .from("seller_products")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[seller/products] base product query failed:", error.message);
    return NextResponse.json({ error: "Unable to load seller products" }, { status: 503 });
  }

  const productIds = (baseProducts ?? []).map((product) => product.id);
  const relationResults = productIds.length === 0 ? [] : await Promise.all([
    supabase.from("product_approvals").select("id, seller_product_id, status, created_at, rejection_reason, notes").in("seller_product_id", productIds),
    supabase.from("product_images").select("seller_product_id, url, storage_path, is_primary").in("seller_product_id", productIds).order("display_order", { ascending: true }),
    supabase.from("product_capabilities").select("seller_product_id, capability_id").in("seller_product_id", productIds),
    supabase.from("product_industries").select("seller_product_id, industry_id").in("seller_product_id", productIds),
    supabase.from("product_materials").select("seller_product_id, material_name").in("seller_product_id", productIds),
    supabase.from("product_grades").select("seller_product_id, grade_name").in("seller_product_id", productIds),
    supabase.from("product_payment_terms").select("seller_product_id, payment_term_id").in("seller_product_id", productIds),
    supabase.from("product_incoterms").select("seller_product_id, incoterm_id").in("seller_product_id", productIds),
  ]);
  const relationNames = ["product_approvals", "product_images", "product_capabilities", "product_industries", "product_materials", "product_grades", "product_payment_terms", "product_incoterms"];
  relationResults.forEach((result, index) => {
    if (result.error) console.warn(`[seller/products] optional relation ${relationNames[index]} unavailable:`, result.error.message);
  });
  const relationByProduct = (index: number) => {
    const grouped = new Map<string, unknown[]>();
    for (const row of relationResults[index]?.data ?? []) {
      const productId = String((row as { seller_product_id?: string }).seller_product_id ?? "");
      if (!productId) continue;
      grouped.set(productId, [...(grouped.get(productId) ?? []), row]);
    }
    return grouped;
  };
  const groupedRelations = relationResults.map((_, index) => relationByProduct(index));
  const products = (baseProducts ?? []).map((product) => ({
    ...product,
    product_approvals: groupedRelations[0]?.get(product.id) ?? [],
    product_images: groupedRelations[1]?.get(product.id) ?? [],
    product_capabilities: groupedRelations[2]?.get(product.id) ?? [],
    product_industries: groupedRelations[3]?.get(product.id) ?? [],
    product_materials: groupedRelations[4]?.get(product.id) ?? [],
    product_grades: groupedRelations[5]?.get(product.id) ?? [],
    product_payment_terms: groupedRelations[6]?.get(product.id) ?? [],
    product_incoterms: groupedRelations[7]?.get(product.id) ?? [],
  }));

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
  const { data: existingProduct, error: existingProductError } = await supabase
    .from("seller_products")
    .select("id, approval_status, lifecycle_status, is_published, featured_requested, draft_version")
    .eq("id", productId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingProductError) {
    return NextResponse.json({ error: existingProductError.message }, { status: 500 });
  }

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
  }

  const expectedVersion = Number(body.expectedVersion ?? existingProduct.draft_version ?? 1);
  if (body.isFeatured !== undefined) {
    return NextResponse.json(
      { success: false, error: { code: "FEATURED_REQUIRES_ADMIN", message: "Use the feature request action; final placement is managed by marketplace administrators." } },
      { status: 422 },
    );
  }
  if (body.featuredRequested !== undefined) {
    const { data, error } = await supabase.rpc("request_seller_product_feature", {
      p_product_id: productId,
      p_expected_version: expectedVersion,
      p_requested: Boolean(body.featuredRequested),
    });
    if (error) {
      const canUseCompatibilityFallback = error.message.includes("does not exist") || error.message.includes("42883") || error.message.includes("schema cache") || error.message.includes("Could not find the function");
      if (canUseCompatibilityFallback) {
        const { data: fallbackProduct, error: fallbackError } = await supabase
          .from("seller_products")
          .update({
            featured_requested: Boolean(body.featuredRequested),
            updated_at: new Date().toISOString(),
            draft_version: expectedVersion + 1,
          })
          .eq("id", productId)
          .eq("profile_id", user.id)
          .eq("draft_version", expectedVersion)
          .select("id, featured_requested, draft_version")
          .maybeSingle();
        if (!fallbackError && fallbackProduct) {
          return NextResponse.json({ success: true, product: fallbackProduct, compatibilityMode: true });
        }
      }
      const code = error.message.includes("CONFLICT_STALE_DRAFT") ? "CONFLICT_STALE_DRAFT" : "FEATURE_REQUEST_FAILED";
      return NextResponse.json({ success: false, error: { code, message: code === "CONFLICT_STALE_DRAFT" ? "This product changed in another session. Refresh and try again." : "The feature request could not be saved." } }, { status: code === "CONFLICT_STALE_DRAFT" ? 409 : 503 });
    }
    return NextResponse.json({ success: true, product: Array.isArray(data) ? data[0] : data });
  }
  if (body.isVisible !== undefined) {
    const { data, error } = await supabase.rpc("set_seller_product_visibility", {
      p_product_id: productId,
      p_expected_version: expectedVersion,
      p_is_visible: Boolean(body.isVisible),
    });
    if (error) {
      const canUseCompatibilityFallback = error.message.includes("PRODUCT_NOT_ACTIVE") || error.message.includes("does not exist") || error.message.includes("42883");
      if (canUseCompatibilityFallback) {
        const { data: fallbackProduct, error: fallbackError } = await supabase
          .from("seller_products")
          .update({
            is_visible: Boolean(body.isVisible),
            updated_at: new Date().toISOString(),
            draft_version: expectedVersion + 1,
          })
          .eq("id", productId)
          .eq("profile_id", user.id)
          .eq("draft_version", expectedVersion)
          .select("id, is_visible, draft_version")
          .maybeSingle();
        if (!fallbackError && fallbackProduct) {
          return NextResponse.json({ success: true, product: fallbackProduct, compatibilityMode: true });
        }
      }
      const code = error.message.includes("CONFLICT_STALE_DRAFT") ? "CONFLICT_STALE_DRAFT" : error.message.includes("PRODUCT_NOT_ACTIVE") ? "PRODUCT_NOT_ACTIVE" : "PRODUCT_VISIBILITY_UPDATE_FAILED";
      return NextResponse.json(
        { success: false, error: { code, message: code === "CONFLICT_STALE_DRAFT" ? "This product changed in another session. Refresh and try again." : "Only approved, active products can be shown to buyers." } },
        { status: code === "CONFLICT_STALE_DRAFT" ? 409 : 422 },
      );
    }
    return NextResponse.json({ success: true, product: Array.isArray(data) ? data[0] : data });
  }

  if (existingProduct.is_published || !["draft", "rejected"].includes(existingProduct.approval_status)) {
    return NextResponse.json(
      { success: false, error: { code: "PRODUCT_NOT_EDITABLE", message: existingProduct.approval_status === "pending_review" ? "This product is awaiting moderation." : "Only draft or rejected products can be edited." } },
      { status: 422 },
    );
  }

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
    const uniqueItems = Array.from(new Set(items.filter((item) => typeof item === "string" && item.trim())));
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("seller_product_id", productId);
    if (deleteError) throw new Error(`${table}: ${deleteError.message}`);
    if (uniqueItems.length > 0) {
      const inserts = uniqueItems.map(item => ({ seller_product_id: productId, [field]: item }));
      const { error: insertError } = await supabase.from(table).insert(inserts);
      if (insertError) throw new Error(`${table}: ${insertError.message}`);
    }
  };

  try {
    await Promise.all([
      body.capabilities && handleRelation("product_capabilities", "capability_id", body.capabilities),
      body.industries && handleRelation("product_industries", "industry_id", body.industries),
      body.materials && handleRelation("product_materials", "material_name", body.materials),
      body.grades && handleRelation("product_grades", "grade_name", body.grades),
      body.paymentTerms && handleRelation("product_payment_terms", "payment_term_id", body.paymentTerms),
      body.incoterms && handleRelation("product_incoterms", "incoterm_id", body.incoterms),
    ]);
  } catch (relationError) {
    console.error("[seller/products PATCH] relation update failed:", relationError);
    return NextResponse.json(
      { error: relationError instanceof Error ? relationError.message : "Related product data failed to save" },
      { status: 503 },
    );
  }

  // Handle images specifically since it requires multiple fields
  if (body.images && Array.isArray(body.images)) {
    const { error: imageDeleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("seller_product_id", productId);
    if (imageDeleteError) {
      return NextResponse.json({ error: `product_images: ${imageDeleteError.message}` }, { status: 503 });
    }
    if (body.images.length > 0) {
      const inserts = body.images.map((img: any, idx: number) => ({
        seller_product_id: productId,
        url: img.url,
        storage_path: img.path,
        is_primary: img.isPrimary || false,
        display_order: idx
      }));
      const { error: imageInsertError } = await supabase.from("product_images").insert(inserts);
      if (imageInsertError) {
        return NextResponse.json({ error: `product_images: ${imageInsertError.message}` }, { status: 503 });
      }
    }
  }

  return NextResponse.json({ success: true, product: { id: productId, draft_version: expectedVersion + 1 } });
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
