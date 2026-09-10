import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  formatCapability,
  formatIncoterm,
  formatIndustry,
  formatLeadTime,
  formatPackaging,
  formatPaymentTerm,
  formatPrecision,
  formatPriceType,
  formatPriceUnit,
  formatShippingType,
} from "@/lib/product/display";

export type ProductMedia = {
  url: string;
  path: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductSpecification = {
  label: string;
  value: string;
};

export type PublicProductDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  productType: string | null;
  status: "active";
  media: ProductMedia[];
  technical: {
    capabilities: string[];
    industries: string[];
    materials: string[];
    grades: string[];
    specification: string | null;
    tolerance: string | null;
    dimensions: ProductSpecification[];
    weight: ProductSpecification[];
    qualityCertificate: string | null;
    tooling: ProductSpecification[];
  };
  manufacturing: {
    productionCapacity: string | null;
    productionCapacityUnit: string | null;
    minimumOrderQuantity: string | null;
    leadTime: string | null;
    inspection: string | null;
  };
  commercial: {
    priceType: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string | null;
    priceUnit: string | null;
    paymentTerms: string[];
    incoterms: string[];
    deliveryTerms: string | null;
    negotiable: boolean;
    freeSample: string | null;
    sampleShippingCost: string | null;
  };
  packaging: {
    shippingType: string | null;
    primary: string | null;
    secondary: string | null;
    notes: string | null;
  };
  seller: {
    companyId: string | null;
    profileId: string | null;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
  };
};

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
  product: PublicProductDetail | null;
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

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function specification(label: string, value: unknown, suffix?: unknown): ProductSpecification | null {
  const normalized = asString(value) ?? (asNumber(value) != null ? String(asNumber(value)) : null);
  if (!normalized) return null;
  const unit = asString(suffix);
  return { label, value: unit ? `${normalized} ${unit}` : normalized };
}

export function toPublicProductDetail(
  product: Record<string, unknown>,
  relations: {
    images?: Record<string, unknown>[] | null;
    capabilities?: Record<string, unknown>[] | null;
    industries?: Record<string, unknown>[] | null;
    materials?: Record<string, unknown>[] | null;
    grades?: Record<string, unknown>[] | null;
    paymentTerms?: Record<string, unknown>[] | null;
    incoterms?: Record<string, unknown>[] | null;
  } = {},
): PublicProductDetail {
  const images = (relations.images ?? [])
    .map((image, index) => {
      const url = asString(image.url);
      return url
        ? {
            url,
            path: asString(image.storage_path),
            isPrimary: Boolean(image.is_primary),
            sortOrder: asNumber(image.display_order) ?? index,
          }
        : null;
    })
    .filter((image): image is ProductMedia => Boolean(image))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  const dimensions = [
    specification("Length", product.dim_length, product.dim_unit),
    specification("Width", product.dim_width, product.dim_unit),
    specification("Height", product.dim_height, product.dim_unit),
  ].filter((item): item is ProductSpecification => Boolean(item));

  const weight = [specification("Product weight", product.weight_value, product.weight_unit)].filter(
    (item): item is ProductSpecification => Boolean(item),
  );
  const tooling = [
    specification("Dies and tools", product.dies_and_tools),
    specification("Estimated tool cost", product.estimated_tool_cost, product.currency),
    specification("Tool ownership", product.tool_ownership),
    specification("Tool lead time", product.tool_lead_time),
  ].filter((item): item is ProductSpecification => Boolean(item));

  return {
    id: String(product.id ?? ""),
    title: asString(product.product_name) ?? "Untitled product",
    slug: String(product.id ?? ""),
    description: asString(product.description),
    category: asString(product.capability) ? formatCapability(product.capability) : null,
    subcategory: null,
    productType: asString(product.specification),
    status: "active",
    media: images,
    technical: {
      capabilities: (relations.capabilities ?? [])
        .map((item) => asString(item.capability_id))
        .filter((item): item is string => Boolean(item))
        .map(formatCapability),
      industries: (relations.industries ?? [])
        .map((item) => asString(item.industry_id))
        .filter((item): item is string => Boolean(item))
        .map(formatIndustry),
      materials: (relations.materials ?? [])
        .map((item) => asString(item.material_name))
        .filter((item): item is string => Boolean(item)),
      grades: (relations.grades ?? [])
        .map((item) => asString(item.grade_name))
        .filter((item): item is string => Boolean(item)),
      specification: asString(product.specification),
      tolerance: asString(product.tolerance_capability) ? formatPrecision(product.tolerance_capability) : null,
      dimensions,
      weight,
      qualityCertificate: asString(product.quality_certificate),
      tooling,
    },
    manufacturing: {
      productionCapacity: asString(product.monthly_capacity) ?? (asNumber(product.monthly_capacity) != null ? String(asNumber(product.monthly_capacity)) : null),
      productionCapacityUnit: asString(product.production_capacity_unit),
      minimumOrderQuantity: asString(product.moq) ?? (asNumber(product.moq) != null ? String(asNumber(product.moq)) : null),
      leadTime: asString(product.lead_time) ? formatLeadTime(product.lead_time) : null,
      inspection: product.third_party_inspection === true ? "Third-party inspection available" : null,
    },
    commercial: {
      priceType: asString(product.price_type) ? formatPriceType(product.price_type) : null,
      minPrice: asNumber(product.min_price),
      maxPrice: asNumber(product.max_price),
      currency: asString(product.currency),
      priceUnit: asString(product.price_unit) ? formatPriceUnit(product.price_unit) : null,
      paymentTerms: (relations.paymentTerms ?? [])
        .map((item) => asString(item.payment_term_id))
        .filter((item): item is string => Boolean(item))
        .map(formatPaymentTerm),
      incoterms: (relations.incoterms ?? [])
        .map((item) => asString(item.incoterm_id))
        .filter((item): item is string => Boolean(item))
        .map(formatIncoterm),
      deliveryTerms: asString(product.delivery_terms),
      negotiable: true,
      freeSample: product.free_sample === true ? "Available" : product.free_sample === false ? "Not Available" : null,
      sampleShippingCost: asString(product.sample_shipping_cost),
    },
    packaging: {
      shippingType: asString(product.shipping_type) ? formatShippingType(product.shipping_type) : null,
      primary: asString(product.primary_packaging) ? formatPackaging(product.primary_packaging) : null,
      secondary: asString(product.secondary_packaging) ? formatPackaging(product.secondary_packaging) : null,
      notes: asString(product.packaging_notes),
    },
    seller: {
      companyId: asString(product.company_id),
      profileId: asString(product.profile_id),
    },
    metadata: {
      createdAt: asString(product.created_at) ?? new Date(0).toISOString(),
      updatedAt: asString(product.updated_at) ?? asString(product.created_at) ?? new Date(0).toISOString(),
      publishedAt: asString(product.published_at),
    },
  };
}

export async function loadListingBySlug(slug: string): Promise<PublicListing | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data: sellerProduct } = await supabase
    .from("seller_products")
    .select("*")
    .eq("id", slug)
    .eq("approval_status", "approved")
    .eq("lifecycle_status", "active")
    .eq("is_published", true)
    .eq("is_visible", true)
    .maybeSingle();

  if (sellerProduct) {
    const [{ data: sellerProfile }, ...relationResults] = await Promise.all([
      supabase
      .from("seller_profiles")
      .select("id, company_id")
      .eq("user_id", sellerProduct.profile_id)
      .maybeSingle(),
      supabase.from("product_images").select("url, storage_path, is_primary, display_order").eq("seller_product_id", sellerProduct.id).order("display_order", { ascending: true }),
      supabase.from("product_capabilities").select("capability_id").eq("seller_product_id", sellerProduct.id),
      supabase.from("product_industries").select("industry_id").eq("seller_product_id", sellerProduct.id),
      supabase.from("product_materials").select("material_name").eq("seller_product_id", sellerProduct.id),
      supabase.from("product_grades").select("grade_name").eq("seller_product_id", sellerProduct.id),
      supabase.from("product_payment_terms").select("payment_term_id").eq("seller_product_id", sellerProduct.id),
      supabase.from("product_incoterms").select("incoterm_id").eq("seller_product_id", sellerProduct.id),
    ]);
    const product = toPublicProductDetail(sellerProduct as Record<string, unknown>, {
      images: relationResults[0].data as Record<string, unknown>[] | null,
      capabilities: relationResults[1].data as Record<string, unknown>[] | null,
      industries: relationResults[2].data as Record<string, unknown>[] | null,
      materials: relationResults[3].data as Record<string, unknown>[] | null,
      grades: relationResults[4].data as Record<string, unknown>[] | null,
      paymentTerms: relationResults[5].data as Record<string, unknown>[] | null,
      incoterms: relationResults[6].data as Record<string, unknown>[] | null,
    });
    const materials = product.technical.materials.length > 0 ? product.technical.materials : asStringArray(sellerProduct.materials);
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
      product,
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

  return data ? { ...data, product: null } : null;
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
