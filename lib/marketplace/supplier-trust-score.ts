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
};

export type SupplierTrustScoreBreakdown = {
  profileCompletionScore: number;
  documentsScore: number;
  verificationScore: number;
  factoryPhotosScore: number;
  certificationsScore: number;
  responseRateScore: number;
  rfqSuccessScore: number;
  trustScore: number;
};

const WEIGHTS = {
  profileCompletion: 0.25,
  documents: 0.2,
  verification: 0.15,
  factoryPhotos: 0.1,
  certifications: 0.1,
  responseRate: 0.1,
  rfqSuccess: 0.1,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
}

export function calculateSupplierTrustScore(
  input: SupplierTrustScoreInput,
): SupplierTrustScoreBreakdown {
  const profileCompletionScore = clamp(input.profileCompletionPercent);

  const documentsScore =
    input.documentsRequired > 0
      ? clamp((input.documentsUploaded / input.documentsRequired) * 70 + (input.documentsApproved / input.documentsRequired) * 30)
      : 0;

  let verificationScore = 0;
  if (input.emailVerified) verificationScore += 50;
  if (input.mobileVerified) verificationScore += 50;
  if (input.adminApproved) verificationScore = clamp(verificationScore + 10);

  const factoryPhotosScore = clamp(Math.min(input.factoryPhotoCount / 5, 1) * 100);

  const certificationsScore = clamp(Math.min(input.certificationCount, 5) * 20);

  const responseRateScore = clamp(input.responseRate ?? 0);
  const rfqSuccessScore = clamp(input.rfqSuccessRate ?? 0);

  const trustScore = Math.round(
    profileCompletionScore * WEIGHTS.profileCompletion +
      documentsScore * WEIGHTS.documents +
      verificationScore * WEIGHTS.verification +
      factoryPhotosScore * WEIGHTS.factoryPhotos +
      certificationsScore * WEIGHTS.certifications +
      responseRateScore * WEIGHTS.responseRate +
      rfqSuccessScore * WEIGHTS.rfqSuccess,
  );

  return {
    profileCompletionScore: Math.round(profileCompletionScore),
    documentsScore: Math.round(documentsScore),
    verificationScore: Math.round(verificationScore),
    factoryPhotosScore: Math.round(factoryPhotosScore),
    certificationsScore: Math.round(certificationsScore),
    responseRateScore: Math.round(responseRateScore),
    rfqSuccessScore: Math.round(rfqSuccessScore),
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
}): SupplierVerificationBadge[] {
  return [
    { key: "verified_supplier", label: "Verified Supplier", earned: input.adminApproved },
    { key: "gst_verified", label: "GST Verified", earned: input.gstVerified },
    { key: "phone_verified", label: "Phone Verified", earned: input.phoneVerified },
    { key: "email_verified", label: "Email Verified", earned: input.emailVerified },
    { key: "factory_verified", label: "Factory Verified", earned: input.factoryPhotoCount >= 5 && input.adminApproved },
  ];
}
