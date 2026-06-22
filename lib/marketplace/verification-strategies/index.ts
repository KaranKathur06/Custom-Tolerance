export type VerificationStrategy = {
  key: "INDIA" | "GLOBAL_DEFAULT";
  verificationType: "GST" | "COMPANY_REGISTRATION" | "DUNS";
  /**
   * KYC verification types as stored in `seller_kyc_verifications.verification_type`.
   * Used for gating “registration requirements” (Phase 1).
   */
  phase1RequiredKycTypes: string[];
};

export function getVerificationStrategy(countryCodeOrId: string | null | undefined): VerificationStrategy {
  // Minimal, backend-compatible heuristic:
  // - If country is India (we can't rely on code format), treat as INDIA.
  // - Otherwise use GLOBAL_DEFAULT.
  // NOTE: In a later iteration, we should resolve by country_id mapping table.
  const v = (countryCodeOrId ?? "").toString().trim().toLowerCase();
  const isIndia =
    v === "in" ||
    v === "india" ||
    v === "100" || // fallback if country_id is numeric-ish
    v.includes("india");

  if (isIndia) {
    return {
      key: "INDIA",
      verificationType: "GST",
      phase1RequiredKycTypes: ["gst", "pan", "factory_license"],
    };
  }

  return {
    key: "GLOBAL_DEFAULT",
    verificationType: "COMPANY_REGISTRATION",
    phase1RequiredKycTypes: ["company_registration"],
  };
}
