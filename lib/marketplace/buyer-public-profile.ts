import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "./slug";

export type BuyerPublicProfile = {
  id: string;
  slug: string;
  displayName: string;
  companyName: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  buyerType: string | null;
  industries: string[];
  procurementCategories: string[];
  profileCompleteness: number;
  verificationStatus: string;
  isUnavailable: boolean;
};

export async function loadBuyerPublicProfile(
  supabase: SupabaseClient,
  slug: string,
): Promise<BuyerPublicProfile | null> {
  const { data, error } = await supabase
    .from("buyers")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  if (data.is_disabled || data.is_suspended || !data.is_published) {
    return {
      id: data.id,
      slug: data.slug,
      displayName: data.display_name,
      companyName: data.company_name,
      shortDescription: null,
      logoUrl: null,
      bannerUrl: null,
      country: null,
      state: null,
      city: null,
      buyerType: null,
      industries: [],
      procurementCategories: [],
      profileCompleteness: 0,
      verificationStatus: data.verification_status,
      isUnavailable: true,
    };
  }

  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    companyName: data.company_name,
    shortDescription: data.short_description,
    logoUrl: data.logo_url,
    bannerUrl: data.banner_url,
    country: data.country,
    state: data.state,
    city: data.city,
    buyerType: data.buyer_type,
    industries: data.industries ?? [],
    procurementCategories: data.procurement_categories ?? [],
    profileCompleteness: Number(data.profile_completeness ?? 0),
    verificationStatus: data.verification_status,
    isUnavailable: false,
  };
}

export async function syncMarketplaceBuyerFromProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const companyName = String(payload.companyName || payload.legalBusinessName || payload.fullName || "").trim();
  if (!companyName) return null;

  const slug = slugify(companyName);
  const displayName = String(payload.contactPersonName || payload.fullName || companyName).trim();

  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("id, company_id, profile_completion_percent")
    .eq("user_id", userId)
    .maybeSingle();

  const buyerPayload = {
    owner_user_id: userId,
    buyer_profile_id: buyerProfile?.id ?? null,
    company_id: buyerProfile?.company_id ?? null,
    display_name: displayName,
    company_name: companyName,
    slug,
    short_description: String(payload.aboutCompany || payload.companyDescription || "").trim() || null,
    logo_url: payload.logoUrl ?? payload.profileImageUrl ?? null,
    banner_url: payload.bannerUrl ?? null,
    country: payload.country ?? "India",
    state: payload.state ?? null,
    city: payload.city ?? null,
    buyer_type: payload.buyerType ?? payload.companyType ?? null,
    industries: Array.isArray(payload.industriesInterestedIn)
      ? (payload.industriesInterestedIn as string[])
      : [],
    procurement_categories: Array.isArray(payload.procurementCategories)
      ? (payload.procurementCategories as string[])
      : [],
    profile_completeness: buyerProfile?.profile_completion_percent ?? 0,
    is_published: true,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("buyers")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("buyers")
      .update(buyerPayload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  const { data, error } = await supabase.from("buyers").insert(buyerPayload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}
