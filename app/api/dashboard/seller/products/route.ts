import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/seller/products
// Returns all products for the authenticated seller
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve seller_profile_id
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
    .select("*")
    .eq("seller_profile_id", sellerProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: products ?? [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/dashboard/seller/products
// Creates a new product
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
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
    .select("id, company_id")
    .eq("profile_id", user.id)
    .single();

  if (!sellerProfile) {
    return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  const { data: product, error } = await supabase
    .from("seller_products")
    .insert({
      seller_profile_id: sellerProfile.id,
      company_id: sellerProfile.company_id,
      profile_id: user.id,
      product_name: String(body.productName ?? ""),
      capability: body.capability ?? null,
      materials: Array.isArray(body.materials) ? body.materials : [],
      tolerance_capability: body.toleranceCapability ?? null,
      monthly_capacity: body.productionCapacity ?? body.monthlyCapacity ?? null,
      production_capacity_unit: body.productionCapacityUnit ?? "pcs",
      moq: body.moq ?? null,
      lead_time: body.leadTime ?? null,
      custom_tolerance: body.customTolerance ?? null,
      is_featured: Boolean(body.isFeatured ?? false),
      is_visible: body.isVisible !== false, // default true
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/seller/products
// Updates a product by id (passed as query param ?id=...)
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
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

  const body = (await req.json()) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (body.productName !== undefined) patch.product_name = String(body.productName);
  if (body.capability !== undefined) patch.capability = body.capability;
  if (body.materials !== undefined) patch.materials = body.materials;
  if (body.toleranceCapability !== undefined) patch.tolerance_capability = body.toleranceCapability;
  if (body.productionCapacity !== undefined) patch.monthly_capacity = body.productionCapacity;
  if (body.productionCapacityUnit !== undefined) patch.production_capacity_unit = body.productionCapacityUnit;
  if (body.moq !== undefined) patch.moq = body.moq;
  if (body.leadTime !== undefined) patch.lead_time = body.leadTime;
  if (body.customTolerance !== undefined) patch.custom_tolerance = body.customTolerance;
  if (body.isFeatured !== undefined) patch.is_featured = Boolean(body.isFeatured);
  if (body.isVisible !== undefined) patch.is_visible = Boolean(body.isVisible);
  patch.updated_at = new Date().toISOString();

  const { data: product, error } = await supabase
    .from("seller_products")
    .update(patch)
    .eq("id", productId)
    .eq("profile_id", user.id) // ownership check
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/dashboard/seller/products
// Deletes a product by id (passed as query param ?id=...)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
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

  const { error } = await supabase
    .from("seller_products")
    .delete()
    .eq("id", productId)
    .eq("profile_id", user.id); // ownership check

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
