export type SupplierTrustScoreInput = {
  profileCompletionPercent: number;
  documentsUploaded: number;
  documentsRequired: number;
  documentsApproved: number;
  emailVerified: boolean;
  mobileVerified: boolean;
  factoryPhotoCount: number;
  certificationCount: number;
  responseRate?: number;
  rfqSuccessRate?: number;
  adminApproved: boolean;
  // New intelligence dimensions
  businessNature?: string;
  industriesServedCount?: number;
  capabilitiesCount?: number;
  buyerServicesCount?: number;
  supplierInterestsCount?: number;
  hasVideoUrl?: boolean;
  factoryLicenseUploaded?: boolean; // rewarded, never gated
};

export type SupplierTrustScoreBreakdown = {
  profileCompletionScore: number;
  documentsScore: number;
  verificationScore: number;
  factoryPhotosScore: number;
  certificationsScore: number;
  responseRateScore: number;
  rfqSuccessScore: number;
  profileRichnessScore: number; // new dimension
  trustScore: number;
};

const NON_MANUFACTURER_NATURES = ["Trading Company", "Individual Trader", "Service Company"];

const WEIGHTS = {
  profileCompletion: 0.20, // reduced from 0.25 to accommodate new dimension
  documents: 0.18,
  verification: 0.15,
  factoryPhotos: 0.08,
  certifications: 0.08,
  responseRate: 0.10,
  rfqSuccess: 0.10,
  profileRichness: 0.11, // new
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

export function calculateSupplierTrustScore(
  input: SupplierTrustScoreInput,
): SupplierTrustScoreBreakdown {
  const profileCompletionScore = clamp(input.profileCompletionPercent);

  const isNonManufacturer = NON_MANUFACTURER_NATURES.includes(input.businessNature ?? "");

  // Documents score: business-nature-aware
  // Non-manufacturers (traders, service) don't need factory license
  // But uploading factory license still gives a bonus to any type
  let docsRequired = input.documentsRequired;
  let docsUploaded = input.documentsUploaded;
  let docsApproved = input.documentsApproved;

  // Factory license bonus for anyone who uploads it
  if (input.factoryLicenseUploaded && !isNonManufacturer) {
    // Factory license was already counted in documentsUploaded for manufacturers
  } else if (input.factoryLicenseUploaded && isNonManufacturer) {
    // Trader uploaded factory license — bonus: treat as extra approved doc
    docsUploaded = Math.min(docsUploaded + 1, docsRequired + 1);
    docsApproved = Math.min(docsApproved + 1, docsRequired + 1);
    docsRequired = Math.max(docsRequired, 1);
  } else if (!input.factoryLicenseUploaded && isNonManufacturer) {
    // Trader without factory license — factory license not counted as missing
    // No penalty: docsRequired already excludes it for non-manufacturers
  }

  const documentsScore =
    docsRequired > 0
      ? clamp(
          (docsUploaded / docsRequired) * 70 +
            (docsApproved / docsRequired) * 30
        )
      : 0;

  let verificationScore = 0;
  if (input.emailVerified) verificationScore += 50;
  if (input.mobileVerified) verificationScore += 50;
  if (input.adminApproved) verificationScore = clamp(verificationScore + 10);

  // Factory photos: non-manufacturers get partial credit (they may have office/showroom)
  const factoryPhotosScore = isNonManufacturer
    ? clamp(Math.min(input.factoryPhotoCount / 3, 1) * 100) // lower bar
    : clamp(Math.min(input.factoryPhotoCount / 5, 1) * 100);

  const certificationsScore = clamp(Math.min(input.certificationCount, 5) * 20);

  const responseRateScore = clamp(input.responseRate ?? 0);
  const rfqSuccessScore = clamp(input.rfqSuccessRate ?? 0);

  // Profile richness score — new dimension
  const industriesScore = clamp((input.industriesServedCount ?? 0) * 10, 0, 30);
  const capabilitiesScore = clamp((input.capabilitiesCount ?? 0) * 5, 0, 30);
  const buyerServicesScore = clamp((input.buyerServicesCount ?? 0) * 8, 0, 25);
  const supplierInterestsScore = clamp((input.supplierInterestsCount ?? 0) * 5, 0, 15);
  const videoBonus = input.hasVideoUrl ? 10 : 0;
  const profileRichnessScore = clamp(
    industriesScore + capabilitiesScore + buyerServicesScore + supplierInterestsScore + videoBonus
  );

  const trustScore = Math.round(
    profileCompletionScore * WEIGHTS.profileCompletion +
      documentsScore * WEIGHTS.documents +
      verificationScore * WEIGHTS.verification +
      factoryPhotosScore * WEIGHTS.factoryPhotos +
      certificationsScore * WEIGHTS.certifications +
      responseRateScore * WEIGHTS.responseRate +
      rfqSuccessScore * WEIGHTS.rfqSuccess +
      profileRichnessScore * WEIGHTS.profileRichness,
  );

  return {
    profileCompletionScore: Math.round(profileCompletionScore),
    documentsScore: Math.round(documentsScore),
    verificationScore: Math.round(verificationScore),
    factoryPhotosScore: Math.round(factoryPhotosScore),
    certificationsScore: Math.round(certificationsScore),
    responseRateScore: Math.round(responseRateScore),
    rfqSuccessScore: Math.round(rfqSuccessScore),
    profileRichnessScore: Math.round(profileRichnessScore),
    trustScore: clamp(trustScore),
  };
}

export type SupplierVerificationBadge = {
  key: string;
  label: string;
  earned: boolean;
};

export function getSupplierVerificationBadges(input: {
  adminApproved: boolean;
  gstVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  factoryPhotoCount: number;
  industriesServedCount?: number;
  capabilitiesCount?: number;
}): SupplierVerificationBadge[] {
  return [
    { key: "verified_supplier", label: "Verified Supplier", earned: input.adminApproved },
    { key: "gst_verified", label: "GST Verified", earned: input.gstVerified },
    { key: "phone_verified", label: "Phone Verified", earned: input.phoneVerified },
    { key: "email_verified", label: "Email Verified", earned: input.emailVerified },
    {
      key: "factory_verified",
      label: "Factory Verified",
      earned: input.factoryPhotoCount >= 5 && input.adminApproved,
    },
    {
      key: "industry_specialist",
      label: "Industry Specialist",
      earned: (input.industriesServedCount ?? 0) >= 3,
    },
    {
      key: "multi_capability",
      label: "Multi-Capability Supplier",
      earned: (input.capabilitiesCount ?? 0) >= 5,
    },
  ];
}
