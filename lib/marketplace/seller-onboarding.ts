export type SellerOnboardingStepKey =
  | "company_information"
  | "address"
  | "capabilities"
  | "factory_information"
  | "verification_documents"
  | "media_uploads"
  | "review_submit";

export type SellerOnboardingStepStatus = "not_started" | "draft" | "complete" | "skipped";

export type SellerOnboardingStep = {
  key: SellerOnboardingStepKey;
  stepNumber: number;
  title: string;
  goal: string;
  requiredFields: string[];
  optionalFields: string[];
  skippableInDevelopment: boolean;
};

export type SellerOnboardingState = {
  currentStep: SellerOnboardingStepKey;
  completedSteps: SellerOnboardingStepKey[];
  skippedSteps: SellerOnboardingStepKey[];
  draftSteps: SellerOnboardingStepKey[];
};

export const SELLER_ONBOARDING_STEPS: SellerOnboardingStep[] = [
  {
    key: "company_information",
    stepNumber: 1,
    title: "Company Information",
    goal: "Establish your business identity for buyer trust.",
    requiredFields: [
      "companyName",
      "legalBusinessName",
      "businessType",
      "companyDescription",
      "yearEstablished",
      "numberOfEmployees",
      "gstNumber",
      "panNumber",
      "website",
      "linkedinUrl",
    ],
    optionalFields: ["facebookUrl", "youtubeUrl"],
    skippableInDevelopment: false,
  },
  {
    key: "address",
    stepNumber: 2,
    title: "Address & Location",
    goal: "Verify your business location and service geography.",
    requiredFields: [
      "countryId",
      "stateId",
      "cityId",
      "fullAddress",
      "pincode",
      "latitude",
      "longitude",
    ],
    optionalFields: ["googleMapsUrl"],
    skippableInDevelopment: false,
  },
  {
    key: "capabilities",
    stepNumber: 3,
    title: "Manufacturing Capabilities",
    goal: "Showcase your production processes and technical capability.",
    requiredFields: ["capabilities"],
    optionalFields: [],
    skippableInDevelopment: false,
  },
  {
    key: "factory_information",
    stepNumber: 4,
    title: "Factory Information",
    goal: "Demonstrate operational scale and quality certifications.",
    requiredFields: [
      "factoryArea",
      "productionArea",
      "warehouseArea",
      "numberOfMachines",
      "qualityCertifications",
    ],
    optionalFields: [],
    skippableInDevelopment: false,
  },
  {
    key: "verification_documents",
    stepNumber: 5,
    title: "Verification Documents",
    goal: "Upload mandatory business verification documents.",
    requiredFields: ["gstCertificate", "panCard", "companyRegistration"],
    optionalFields: ["isoCertificate", "productCatalog"],
    skippableInDevelopment: false,
  },
  {
    key: "media_uploads",
    stepNumber: 6,
    title: "Factory Media",
    goal: "Build buyer confidence with factory photos and optional video.",
    requiredFields: ["factoryPhotos"],
    optionalFields: ["factoryVideo"],
    skippableInDevelopment: false,
  },
  {
    key: "review_submit",
    stepNumber: 7,
    title: "Review & Submit",
    goal: "Verify contact details and submit for admin review.",
    requiredFields: ["emailVerified", "mobileVerified"],
    optionalFields: [],
    skippableInDevelopment: false,
  },
];

function hasValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined && value !== false;
}

function fieldHasValue(field: string, values: Record<string, unknown>): boolean {
  if (field === "capabilities") {
    return Array.isArray(values.capabilities) && values.capabilities.length > 0;
  }
  if (field === "factoryPhotos") {
    return Array.isArray(values.factoryPhotos) && values.factoryPhotos.length >= 5;
  }
  if (field === "qualityCertifications") {
    return Array.isArray(values.qualityCertifications) && values.qualityCertifications.length > 0;
  }
  if (field === "gstCertificate") {
    return hasValue(values.gstCertificate) || hasValue(values.gstCertificateUrl);
  }
  if (field === "panCard") {
    return hasValue(values.panCard) || hasValue(values.panCardUrl);
  }
  if (field === "companyRegistration") {
    return hasValue(values.companyRegistration) || hasValue(values.companyRegistrationUrl);
  }
  if (field === "mobileVerified") {
    return Boolean(values.mobileVerified ?? values.phoneVerified);
  }
  return hasValue(values[field]);
}

export function getStepStatus(
  step: SellerOnboardingStep,
  values: Record<string, unknown>,
  state?: Partial<SellerOnboardingState>,
): SellerOnboardingStepStatus {
  if (state?.completedSteps?.includes(step.key)) {
    return "complete";
  }

  if (state?.skippedSteps?.includes(step.key)) {
    return "skipped";
  }

  if (state?.draftSteps?.includes(step.key)) {
    return "draft";
  }

  const requiredComplete = step.requiredFields.every((field) => fieldHasValue(field, values));
  const anyFieldStarted = [...step.requiredFields, ...step.optionalFields].some((field) =>
    fieldHasValue(field, values),
  );

  if (requiredComplete) {
    return "complete";
  }

  if (anyFieldStarted) {
    return "draft";
  }

  return "not_started";
}

export function getSellerOnboardingProgress(
  values: Record<string, unknown>,
  state?: Partial<SellerOnboardingState>,
) {
  const steps = SELLER_ONBOARDING_STEPS.map((step) => ({
    ...step,
    status: getStepStatus(step, values, state),
  }));

  const completedCount = steps.filter((step) => step.status === "complete").length;
  const draftCount = steps.filter((step) => step.status === "draft").length;
  const skippedCount = steps.filter((step) => step.status === "skipped").length;
  const percent = Math.round((completedCount / steps.length) * 100);
  const currentStep =
    steps.find((step) => step.status === "draft") ??
    steps.find((step) => step.status === "not_started") ??
    steps[steps.length - 1];

  return {
    percent,
    completedCount,
    draftCount,
    skippedCount,
    currentStep,
    steps,
  };
}

export function canSkipSellerOnboardingStep(input: {
  step: SellerOnboardingStep;
  developmentTrustMode: boolean;
}) {
  return input.developmentTrustMode && input.step.skippableInDevelopment;
}
