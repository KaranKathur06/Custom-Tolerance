/**
 * Seller Verification Policy Resolver
 *
 * Central, server-authoritative source of truth for seller verification requirements.
 * Determines the required verification channel based on the seller's canonical country.
 *
 * Business rules:
 * - Indian sellers → PHONE_OTP (mobile number verification via WhatsApp/SMS)
 * - Foreign sellers → EMAIL (email verification)
 *
 * This policy MUST be used by:
 * - Seller registration
 * - Seller onboarding UI
 * - Seller profile completion checks
 * - Admin verification dashboard
 * - Marketplace eligibility checks
 * - Listing creation gates
 *
 * NEVER trust client-supplied country — always read from the canonical seller profile.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationChannel = "PHONE_OTP" | "EMAIL";

export type SellerVerificationPolicy = {
  country: string;
  verificationChannel: VerificationChannel;
  phoneRequired: boolean;
  emailRequired: boolean;
};

export type SellerVerificationState = {
  policy: SellerVerificationPolicy;
  email: {
    required: boolean;
    verified: boolean;
  };
  phone: {
    required: boolean;
    verified: boolean;
  };
  gst: {
    required: boolean;
    verified: boolean;
  };
  bank: {
    required: boolean;
    verified: boolean;
  };
  missingRequirements: string[];
  canContinue: boolean;
  completionPercent: number;
};

const INDIA_COUNTRY_NAMES = new Set([
  "india",
  "in",
  "ind",
  "bharat",
]);

/**
 * Determine if the country is India.
 * Normalizes common variants.
 */
export function isIndianSeller(country: string | null | undefined): boolean {
  if (!country) return false;
  return INDIA_COUNTRY_NAMES.has(country.trim().toLowerCase());
}

/**
 * Get the verification policy for a given country.
 * This is a pure function — safe for server and client use.
 */
export function getVerificationPolicyForCountry(
  country: string | null | undefined,
): SellerVerificationPolicy {
  const normalizedCountry = (country ?? "").trim() || "Unknown";
  const isIndia = isIndianSeller(country);

  return {
    country: normalizedCountry,
    verificationChannel: isIndia ? "PHONE_OTP" : "EMAIL",
    phoneRequired: isIndia,
    emailRequired: !isIndia,
  };
}

/**
 * Get the verification policy for a specific seller by ID.
 * Reads country from the canonical seller profile (server-authoritative).
 * NEVER trusts client-supplied country.
 */
export async function getSellerVerificationPolicy(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerVerificationPolicy | null> {
  // Try seller_profiles first (contains canonical onboarding data)
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("country")
    .eq("profile_id", sellerId)
    .maybeSingle();

  if (sellerProfile?.country) {
    return getVerificationPolicyForCountry(sellerProfile.country);
  }

  // Fall back to profiles.location JSON
  const { data: profile } = await supabase
    .from("profiles")
    .select("location")
    .eq("id", sellerId)
    .maybeSingle();

  const location = profile?.location as { country?: string } | null;
  if (location?.country) {
    return getVerificationPolicyForCountry(location.country);
  }

  // Fall back to suppliers table
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("location")
    .eq("user_id", sellerId)
    .maybeSingle();

  if (supplier?.location) {
    // Location in suppliers is a string like "Mumbai, India"
    const locationStr = typeof supplier.location === "string"
      ? supplier.location
      : "";
    const parts = locationStr.split(",").map((s: string) => s.trim());
    const countryPart = parts[parts.length - 1] || "";
    return getVerificationPolicyForCountry(countryPart);
  }

  return null;
}

/**
 * Get the full verification state for a seller.
 * Combines policy + actual verification status from the database.
 */
export async function getSellerVerificationState(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<SellerVerificationState | null> {
  const policy = await getSellerVerificationPolicy(supabase, sellerId);
  if (!policy) return null;

  // Fetch actual verification state
  const [profileResult, mobileResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, phone, verification_status")
      .eq("id", sellerId)
      .maybeSingle(),
    supabase
      .from("mobile_verifications")
      .select("verified")
      .eq("user_id", sellerId)
      .eq("verified", true)
      .maybeSingle(),
  ]);

  // Check Supabase Auth email verification
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const authEmailVerified = Boolean(authUser?.email_confirmed_at);

  const phoneVerified = Boolean(mobileResult.data?.verified);
  const gstVerified = false; // TODO: implement when GST verification is wired
  const bankVerified = false; // TODO: implement when bank verification is wired

  const missing: string[] = [];

  if (policy.phoneRequired && !phoneVerified) {
    missing.push("Phone verification");
  }
  if (policy.emailRequired && !authEmailVerified) {
    missing.push("Email verification");
  }

  const totalRequirements = (policy.phoneRequired ? 1 : 0) + (policy.emailRequired ? 1 : 0);
  const completedRequirements =
    (policy.phoneRequired && phoneVerified ? 1 : 0) +
    (policy.emailRequired && authEmailVerified ? 1 : 0);

  return {
    policy,
    email: {
      required: policy.emailRequired,
      verified: authEmailVerified,
    },
    phone: {
      required: policy.phoneRequired,
      verified: phoneVerified,
    },
    gst: {
      required: false, // Not yet enforced
      verified: gstVerified,
    },
    bank: {
      required: false, // Not yet enforced
      verified: bankVerified,
    },
    missingRequirements: missing,
    canContinue: missing.length === 0,
    completionPercent: totalRequirements > 0
      ? Math.round((completedRequirements / totalRequirements) * 100)
      : 100,
  };
}
