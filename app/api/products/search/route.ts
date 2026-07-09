/**
 * GET /api/products/search
 * Full-text search for published products with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      products: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  }

  const url = request.nextUrl;
  const query = url.searchParams.get("q") || "";
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "20");
  const capability = url.searchParams.get("capability") || "";
  const material = url.searchParams.get("material") || "";
  const sortBy = url.searchParams.get("sort") || "latest";

  const offset = (page - 1) * limit;

  try {
    // Build search query
    let searchQuery = supabase
      .from("seller_products")
      .select(
        `
        id, product_name, capability, materials, tolerance_capability,
        production_capacity_unit, moq, lead_time, is_published, is_featured,
        published_at, listing_id, estimated_price_per_unit, quantity_available,
        seller_profile_id, profile_id,
        seller_profiles!inner(company_id, profile_completion_percent),
        companies!seller_products_company_id_fk(name, verification_status)
        `,
        { count: "exact" }
      )
      .eq("is_published", true)
      .eq("approval_status", "approved");

    // Full-text search
    if (query) {
      searchQuery = searchQuery.or(
        `product_name.ilike.%${query}%,capability.ilike.%${query}%,custom_tolerance.ilike.%${query}%`
      );
    }

    // Capability filter
    if (capability) {
      searchQuery = searchQuery.eq("capability", capability);
    }

    // Material filter (array contains)
    if (material) {
      searchQuery = searchQuery.contains("materials", [material]);
    }

    // Sorting
    if (sortBy === "featured") {
      searchQuery = searchQuery
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
    } else if (sortBy === "price_asc") {
      searchQuery = searchQuery.order("estimated_price_per_unit", {
        ascending: true,
      });
    } else if (sortBy === "price_desc") {
      searchQuery = searchQuery.order("estimated_price_per_unit", {
        ascending: false,
      });
    } else {
      // latest (default)
      searchQuery = searchQuery.order("published_at", { ascending: false });
    }

    const { data: products, count, error } = await searchQuery.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      console.error("[products/search]", error.message);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("[products/search]", err);
    return NextResponse.json(
      { error: "Search error" },
      { status: 500 }
    );
  }
}
