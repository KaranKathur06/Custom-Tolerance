import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupplierOnboardingStatus } from "./supplier-onboarding-status";
import { getVerificationStrategy } from "./verification-strategies";

export async function getBuyerV3GateContext(supabase: SupabaseClient, userId: string) {
  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("id, trust_level, profile_completion_percent")
    .eq("profile_id", userId)
    .maybeSingle();

  const { data: buyerPreferences } = buyerProfile?.id
    ? await supabase
        .from("buyer_preferences")
        .select("email_verified, mobile_verified, completion_percent")
        .eq("buyer_profile_id", buyerProfile.id)
        .maybeSingle()
    : { data: null };

  return {
    buyerProfile,
    emailVerified: Boolean(buyerPreferences?.email_verified),
    mobileVerified: Boolean(buyerPreferences?.mobile_verified),
    profileCompletionPercent:
      buyerPreferences?.completion_percent ?? buyerProfile?.profile_completion_percent ?? 0,
    trustLevel: Math.min(4, Math.max(0, buyerProfile?.trust_level ?? 0)) as 0 | 1 | 2 | 3 | 4,
  };
}

export async function getSellerV3ActivationContext(supabase: SupabaseClient, userId: string) {
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select(
      "id, company_id, onboarding_status, profile_completion_percent, trust_level, companies(country_id)",
    )
    .eq("profile_id", userId)
    .maybeSingle();

  if (!sellerProfile) {
    return {
      sellerProfile: null,
      requiredDocumentsUploaded: false,
      registrationDocumentsVerified: false,
      trustDocumentsVerified: false,
      bankVerified: false,
      countryOrigin: null,
      verificationRegion: null,
      verificationType: null,
    };
  }

  const countryOrigin =
    (sellerProfile as any)?.companies?.country_id?.toString?.() ?? null;

  const strategy = getVerificationStrategy(countryOrigin);

  const { data: kycs } = await supabase
    .from("seller_kyc_verifications")
    .select("verification_type, is_verified")
    .eq("seller_profile_id", sellerProfile.id);

  const verified = new Set(
    (kycs ?? []).filter((item) => item.is_verified).map((item) => item.verification_type),
  );

  const registrationDocumentsVerified = strategy.phase1RequiredKycTypes.every((t) => verified.has(t));

  const { data: bank } = await supabase
    .from("seller_bank_details")
    .select("verification_status")
    .eq("seller_profile_id", sellerProfile.id)
    .maybeSingle();

  // Phase 2 signals are trust-building (non-blocking). v1 approximation:
  // - bank verified counts as a trust document signal.
  // - factory media/certifications export history are not computed here yet.
  const trustDocumentsVerified = Boolean(bank?.verification_status === "approved");

  return {
    sellerProfile: {
      ...sellerProfile,
      onboarding_status: sellerProfile.onboarding_status as SupplierOnboardingStatus,
    },
    // Backward-compatible field (old name):
    requiredDocumentsUploaded: registrationDocumentsVerified,
    // New explicit fields:
    registrationDocumentsVerified,
    trustDocumentsVerified,
    bankVerified: bank?.verification_status === "approved",
    countryOrigin,
    verificationRegion: strategy.verificationRegion,
    verificationType: strategy.verificationType,
  };
}
