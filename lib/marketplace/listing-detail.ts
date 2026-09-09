import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type PublicListing = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  metal_type: string | null;
  grade: string | null;
  material_spec: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: string | null;
  currency: string | null;
  is_negotiable: boolean | null;
  moq: string | null;
  lead_time: string | null;
  production_capacity: string | null;
  certifications: string[] | null;
  quantity_available: number | null;
  unit: string | null;
  listing_type: string | null;
  is_featured: boolean | null;
  views_count: number | null;
  inquiry_count: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  company_id: string | null;
  seller_profile_id: string | null;
};

export type ListingCompany = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  verification_status: string | null;
  trust_level: number | null;
  years_in_business: number | null;
  company_size: string | null;
  website: string | null;
  gst_number: string | null;
  marketplace_supplier_id: string | null;
};

export async function loadListingBySlug(slug: string): Promise<PublicListing | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data: sellerProduct } = await supabase
    .from("seller_products")
    .select("id, product_name, description, capability, materials, moq, lead_time, monthly_capacity, is_featured, profile_id, published_at, updated_at")
    .eq("id", slug)
    .eq("approval_status", "approved")
    .eq("lifecycle_status", "active")
    .eq("is_published", true)
    .eq("is_visible", true)
    .maybeSingle();

  if (sellerProduct) {
    const { data: sellerProfile } = await supabase
      .from("seller_profiles")
      .select("id, company_id")
      .eq("user_id", sellerProduct.profile_id)
      .maybeSingle();
    const materials = Array.isArray(sellerProduct.materials) ? sellerProduct.materials : [];
    return {
      id: sellerProduct.id,
      title: sellerProduct.product_name,
      slug: sellerProduct.id,
      description: sellerProduct.description,
      metal_type: sellerProduct.capability,
      grade: null,
      material_spec: materials.join(", ") || null,
      price_min: null,
      price_max: null,
      price_unit: null,
      currency: null,
      is_negotiable: true,
      moq: sellerProduct.moq == null ? null : String(sellerProduct.moq),
      lead_time: sellerProduct.lead_time == null ? null : String(sellerProduct.lead_time),
      production_capacity: sellerProduct.monthly_capacity == null ? null : String(sellerProduct.monthly_capacity),
      certifications: null,
      quantity_available: null,
      unit: null,
      listing_type: "product",
      is_featured: sellerProduct.is_featured,
      views_count: null,
      inquiry_count: null,
      seo_title: null,
      seo_description: null,
      created_at: sellerProduct.published_at ?? sellerProduct.updated_at,
      company_id: sellerProfile?.company_id ?? null,
      seller_profile_id: sellerProfile?.id ?? null,
    };
  }

  const { data } = await supabase
    .from("listings")
    .select(
      `
      id, title, slug, description, metal_type, grade, material_spec,
      price_min, price_max, price_unit, currency, is_negotiable,
      moq, lead_time, production_capacity, certifications,
      quantity_available, unit, listing_type, is_featured,
      views_count, inquiry_count, keywords, applications,
      seo_title, seo_description, is_active, created_at,
      company_id, seller_profile_id
    `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

export async function loadListingCompany(companyId: string | null): Promise<ListingCompany | null> {
  if (!companyId) return null;
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, slug, logo_url, verification_status, trust_level, years_in_business, company_size, website, gst_number, marketplace_supplier_id",
    )
    .eq("id", companyId)
    .maybeSingle();

  return data;
}

export async function loadSupplierListings(input: {
  companyId?: string | null;
  sellerProfileId?: string | null;
  limit?: number;
}) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("seller_products")
    .select("id, product_name, capability, materials, moq, is_featured, lead_time, published_at, profile_id")
    .eq("approval_status", "approved")
    .eq("lifecycle_status", "active")
    .eq("is_published", true)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 12);

  if (input.sellerProfileId) {
    const { data: sellerProfile } = await supabase
      .from("seller_profiles")
      .select("user_id")
      .eq("id", input.sellerProfileId)
      .maybeSingle();
    if (!sellerProfile?.user_id) return [];
    query = query.eq("profile_id", sellerProfile.user_id);
  } else if (input.companyId) {
    const { data: sellerProfiles } = await supabase
      .from("seller_profiles")
      .select("user_id")
      .eq("company_id", input.companyId);
    const userIds = (sellerProfiles ?? []).map((profile) => profile.user_id).filter(Boolean);
    if (userIds.length === 0) return [];
    query = query.in("profile_id", userIds);
  } else {
    return [];
  }

  const { data } = await query;
  return (data ?? []).map((product) => ({
    id: product.id,
    title: product.product_name,
    slug: product.id,
    metal_type: product.capability,
    price_min: null,
    price_max: null,
    moq: product.moq,
    is_featured: product.is_featured,
    lead_time: product.lead_time,
    created_at: product.published_at,
    materials: product.materials,
  }));
}
