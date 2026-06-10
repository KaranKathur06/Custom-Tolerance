import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplierCertificationSummary } from "./ranking";

export type GalleryCategory =
  | "factory"
  | "machine"
  | "product"
  | "quality_lab"
  | "certificate";

export type SupplierGalleryImage = {
  id: string;
  category: GalleryCategory;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

export type SupplierCertificationDetail = SupplierCertificationSummary & {
  id: string;
  certificate_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document_url: string | null;
  verified_at: string | null;
  verification_status: string;
};

export type SupplierReviewStats = {
  overall_avg: number;
  quality_avg: number;
  delivery_avg: number;
  communication_avg: number;
  pricing_avg: number;
  total_count: number;
  verified_count: number;
  rating_distribution: Record<string, number>;
};

export type SupplierReview = {
  id: string;
  overall_rating: number;
  quality_rating: number | null;
  delivery_rating: number | null;
  communication_rating: number | null;
  pricing_rating: number | null;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  response: {
    body: string;
    created_at: string;
  } | null;
};

export type GstVerificationSnapshot = {
  gstin: string;
  legal_name: string | null;
  gst_state: string | null;
  registration_date: string | null;
  status: string;
  verified_at: string;
};

export type SupplierExtendedProfile = {
  gallery: SupplierGalleryImage[];
  certifications: SupplierCertificationDetail[];
  reviewStats: SupplierReviewStats | null;
  reviews: SupplierReview[];
  gstVerification: GstVerificationSnapshot | null;
  isSaved: boolean;
  founding_year: number | null;
  employee_count: number | null;
  cover_image_url: string | null;
  payment_terms: string | null;
  lead_time_range: string | null;
  member_since: string | null;
  gst_verified_at: string | null;
  gst_legal_name: string | null;
  review_count: number;
  review_avg: number;
  verified_order_count: number;
  avg_quote_time: string | null;
};

const EMPTY_STATS: SupplierReviewStats = {
  overall_avg: 0,
  quality_avg: 0,
  delivery_avg: 0,
  communication_avg: 0,
  pricing_avg: 0,
  total_count: 0,
  verified_count: 0,
  rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

export async function loadSupplierGallery(
  supabase: SupabaseClient,
  supplierId: string,
): Promise<SupplierGalleryImage[]> {
  const { data, error } = await supabase
    .from("supplier_gallery")
    .select("id, category, image_url, caption, sort_order")
    .eq("supplier_id", supplierId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[loadSupplierGallery]", error.message);
    return [];
  }

  return (data ?? []) as SupplierGalleryImage[];
}

export async function loadSupplierCertificationDetails(
  supabase: SupabaseClient,
  supplierId: string,
): Promise<SupplierCertificationDetail[]> {
  const { data, error } = await supabase
    .from("supplier_certifications")
    .select(
      `
      id,
      certificate_number,
      issued_at,
      expires_at,
      document_url,
      verified_at,
      verification_status,
      certifications(name, slug, business_priority, global_recognition_level)
    `,
    )
    .eq("supplier_id", supplierId)
    .eq("is_archived", false)
    .order("expires_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[loadSupplierCertificationDetails]", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const cert = row.certifications as Record<string, unknown>;
    return {
      id: row.id as string,
      name: cert.name as string,
      slug: cert.slug as string,
      certificate_number: row.certificate_number as string | null,
      issued_at: row.issued_at as string | null,
      expires_at: row.expires_at as string | null,
      document_url: row.document_url as string | null,
      verified_at: row.verified_at as string | null,
      verification_status: row.verification_status as string,
      status: row.verification_status as string,
      business_priority: cert.business_priority as number,
      global_recognition_level: cert.global_recognition_level as number,
    };
  });
}

export async function loadSupplierReviewStats(
  supabase: SupabaseClient,
  supplierId: string,
): Promise<SupplierReviewStats> {
  const { data, error } = await supabase.rpc("get_supplier_review_stats", {
    target_supplier_id: supplierId,
  });

  if (error || !data) {
    console.error("[loadSupplierReviewStats]", error?.message);
    return EMPTY_STATS;
  }

  return data as SupplierReviewStats;
}

export async function loadSupplierReviews(
  supabase: SupabaseClient,
  supplierId: string,
  page = 1,
  pageSize = 5,
): Promise<{ reviews: SupplierReview[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("reviews")
    .select(
      `
      id,
      overall_rating,
      quality_rating,
      delivery_rating,
      communication_rating,
      pricing_rating,
      title,
      body,
      is_verified_purchase,
      created_at,
      review_responses(body, created_at)
    `,
      { count: "exact" },
    )
    .eq("supplier_id", supplierId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[loadSupplierReviews]", error.message);
    return { reviews: [], total: 0 };
  }

  const reviews: SupplierReview[] = (data ?? []).map((row: Record<string, unknown>) => {
    const responses = row.review_responses as Array<{ body: string; created_at: string }> | null;
    const response = responses?.[0] ?? null;
    return {
      id: row.id as string,
      overall_rating: row.overall_rating as number,
      quality_rating: row.quality_rating as number | null,
      delivery_rating: row.delivery_rating as number | null,
      communication_rating: row.communication_rating as number | null,
      pricing_rating: row.pricing_rating as number | null,
      title: row.title as string | null,
      body: row.body as string | null,
      is_verified_purchase: row.is_verified_purchase as boolean,
      created_at: row.created_at as string,
      response,
    };
  });

  return { reviews, total: count ?? 0 };
}

export async function loadGstVerification(
  supabase: SupabaseClient,
  supplierId: string,
): Promise<GstVerificationSnapshot | null> {
  const { data, error } = await supabase
    .from("gst_verifications")
    .select("gstin, legal_name, gst_state, registration_date, status, verified_at")
    .eq("supplier_id", supplierId)
    .eq("is_current", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as GstVerificationSnapshot;
}

export async function checkSupplierSaved(
  supabase: SupabaseClient,
  supplierId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;

  const { data } = await supabase
    .from("saved_suppliers")
    .select("id")
    .eq("supplier_id", supplierId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export async function loadSupplierExtendedProfile(
  supabase: SupabaseClient,
  supplierId: string,
  userId: string | null,
  reviewPage = 1,
): Promise<SupplierExtendedProfile> {
  const [
    gallery,
    certifications,
    reviewStats,
    { reviews },
    gstVerification,
    isSaved,
    supplierRow,
  ] = await Promise.all([
    loadSupplierGallery(supabase, supplierId),
    loadSupplierCertificationDetails(supabase, supplierId),
    loadSupplierReviewStats(supabase, supplierId),
    loadSupplierReviews(supabase, supplierId, reviewPage),
    loadGstVerification(supabase, supplierId),
    checkSupplierSaved(supabase, supplierId, userId),
    supabase
      .from("suppliers")
      .select(
        `
        founding_year,
        established_year,
        employee_count,
        cover_image_url,
        banner_url,
        payment_terms,
        lead_time_range,
        member_since,
        gst_verified_at,
        gst_legal_name,
        review_count,
        review_avg,
        verified_order_count,
        avg_quote_time
      `,
      )
      .eq("id", supplierId)
      .maybeSingle(),
  ]);

  const row = supplierRow.data;

  return {
    gallery,
    certifications,
    reviewStats,
    reviews,
    gstVerification,
    isSaved,
    founding_year: row?.founding_year ?? row?.established_year ?? null,
    employee_count: row?.employee_count ?? null,
    cover_image_url: row?.cover_image_url ?? row?.banner_url ?? null,
    payment_terms: row?.payment_terms ?? null,
    lead_time_range: row?.lead_time_range ?? null,
    member_since: row?.member_since ?? null,
    gst_verified_at: row?.gst_verified_at ?? null,
    gst_legal_name: row?.gst_legal_name ?? null,
    review_count: row?.review_count ?? 0,
    review_avg: Number(row?.review_avg ?? 0),
    verified_order_count: row?.verified_order_count ?? 0,
    avg_quote_time: row?.avg_quote_time ?? null,
  };
}
