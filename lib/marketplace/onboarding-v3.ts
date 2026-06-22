export const BUYER_ONBOARDING_V3_FLOW_KEY = "buyer_onboarding_v3";
export const SELLER_ONBOARDING_V3_FLOW_KEY = "seller_onboarding_v3";
export const ONBOARDING_V3_FLOW_VERSION = 3;

export type BuyerOnboardingV3StepKey =
  | "buyer_registration"
  | "business_information"
  | "profile_completion";

export type SellerOnboardingV3StepKey =
  | "company_verification"
  | "basic_information"
  | "registration_complete"
  | "business_details"
  | "bank_details";

export type OnboardingStepDefinition<TStepKey extends string> = {
  key: TStepKey;
  title: string;
  goal: string;
  requiredFields: string[];
  phase?: "registration" | "profile_boost";
};

export const BUYER_ONBOARDING_V3_STEPS: OnboardingStepDefinition<BuyerOnboardingV3StepKey>[] = [
  {
    key: "buyer_registration",
    title: "Buyer Registration",
    goal: "Verify your company identity and procurement contact details.",
    requiredFields: [
      "companyName",
      "businessEmail",
      "emailVerified",
      "country",
      "state",
      "city",
      "companyWebsite",
      "companyType",
      "fullName",
      "designation",
      "mobileNumber",
      "mobileVerified",
      "industries",
      "categoryInterests",
      "buyerAgreement",
      "termsAccepted",
      "privacyAccepted",
    ],
  },
  {
    key: "business_information",
    title: "Business Information",
    goal: "Capture buying behavior for RFQ matching and supplier recommendations.",
    requiredFields: [
      "annualProcurementBudget",
      "orderFrequency",
      "procurementMethods",
      "importExperience",
      "preferredIncoterms",
      "preferredPaymentTerms",
    ],
  },
  {
    key: "profile_completion",
    title: "Profile Completion",
    goal: "Strengthen buyer trust with public business context.",
    requiredFields: ["companyDescription", "procurementTeamSize"],
  },
];

export const SELLER_ONBOARDING_V3_STEPS: OnboardingStepDefinition<SellerOnboardingV3StepKey>[] = [
  {
    key: "company_verification",
    title: "Company Verification",
    goal: "Verify your business identity. Country determines verification requirements.",
    requiredFields: [
      "countryOrigin",
      "legalBusinessName",
      "addressLine1",
      "city",
      "state",
      "postalCode",
    ],
    phase: "registration",
  },
  {
    key: "basic_information",
    title: "Basic Information",
    goal: "Confirm contact details, email, mobile, and factory address.",
    requiredFields: [
      "contactPersonName",
      "designation",
      "mobileNumber",
      "mobileVerified",
      "businessEmail",
      "emailVerified",
    ],
    phase: "registration",
  },
  {
    key: "registration_complete",
    title: "Registration Complete",
    goal: "Your marketplace account is now active.",
    requiredFields: [],
    phase: "registration",
  },
  {
    key: "business_details",
    title: "Business Details",
    goal: "Describe capabilities, products, factory, team, and quality systems for higher visibility.",
    requiredFields: ["sellerTypes"],
    phase: "profile_boost",
  },
  {
    key: "bank_details",
    title: "Bank Details",
    goal: "Add bank details and upload KYC documents for trust verification.",
    requiredFields: [
      "bankName",
      "accountHolderName",
      "accountNumber",
      "confirmAccountNumber",
      "sellerAgreement",
      "termsAccepted",
      "privacyAccepted",
      "kycConsent",
    ],
    phase: "profile_boost",
  },
];

export const COMPANY_TYPES = [
  "OEM",
  "Importer",
  "Exporter",
  "Distributor",
  "Trader",
  "EPC Company",
  "Manufacturer",
  "Government Organization",
  "Startup",
  "Service Company",
  "Other",
] as const;

export const BUYER_DESIGNATIONS = [
  "Founder",
  "CEO",
  "Director",
  "Procurement Manager",
  "Purchase Executive",
  "Engineer",
  "Sourcing Manager",
  "Plant Head",
  "Operations Head",
  "Other",
] as const;

export const INDUSTRY_OPTIONS = [
  "Automotive",
  "Aerospace",
  "Agriculture",
  "Oil & Gas",
  "Defence",
  "Marine",
  "Construction",
  "Railway",
  "Medical",
  "Mining",
  "CNC Machining",
  "Casting",
  "Forging",
  "Sheet Metal",
  "Injection Molding",
  "Fasteners",
  "Electronics",
  "Extrusion",
] as const;

export const CATEGORY_INTEREST_OPTIONS = [
  "CNC Components",
  "Castings",
  "Forgings",
  "Pumps",
  "Valves",
  "Gears",
  "Shafts",
  "Bearings",
  "Steel Components",
  "Brass Components",
  "Aluminum Parts",
  "Plastic Parts",
] as const;

export const ANNUAL_PROCUREMENT_BUDGETS = [
  "Below $50K",
  "$50K-$100K",
  "$100K-$500K",
  "$500K-$1M",
  "$1M-$5M",
  "$5M+",
] as const;

export const ORDER_FREQUENCIES = ["One Time", "Monthly", "Quarterly", "Yearly", "Continuous"] as const;
export const PROCUREMENT_METHODS = [
  "RFQ Based",
  "Contract Manufacturing",
  "Reverse Auction",
  "Direct Purchase",
  "Repeat Orders",
] as const;
export const IMPORT_EXPERIENCE_OPTIONS = ["No", "1-2 Years", "3-5 Years", "5+ Years"] as const;
export const INCOTERMS = ["EXW", "FOB", "CIF", "DDP", "FCA", "CPT", "CIP"] as const;
export const PAYMENT_TERMS = ["Advance", "LC", "Net 30", "Net 60", "Net 90", "Escrow"] as const;
export const PROCUREMENT_TEAM_SIZES = ["1-5", "6-20", "21-50", "50+"] as const;

export const SELLER_TYPES = [
  "Manufacturer",
  "Exporter",
  "Trader",
  "OEM",
  "ODM",
  "Contract Manufacturer",
  "Service Provider",
  "Design & Engineering Company",
  "Distributor",
  "Raw Material Supplier",
  "Tool Room",
  "Prototype Manufacturer",
  "Assembly Supplier",
  "Other",
] as const;

export const CAPABILITY_CATEGORIES = [
  "CNC Machining",
  "CNC Turning",
  "CNC Milling",
  "Casting",
  "Forging",
  "Injection Molding",
  "Fabrication",
  "Extrusion",
  "Laser Cutting",
  "Welding",
  "3D Printing",
  "Surface Finishing",
  "Heat Treatment",
  "Assembly",
  "Sheet Metal",
  "Fasteners",
  "Rubber Molding",
  "Plastic Molding",
  "Other",
] as const;

export const PRODUCT_CAPABILITY_OPTIONS = [
  "CNC Turning",
  "CNC Milling",
  "Casting",
  "Forging",
  "Injection Molding",
  "Fabrication",
  "Extrusion",
  "Laser Cutting",
  "Welding",
  "3D Printing",
  "Surface Finishing",
  "Heat Treatment",
  "Assembly",
  "Other",
] as const;

export const TOLERANCE_OPTIONS = [
  "\u00B10.5 mm",
  "\u00B10.25 mm",
  "\u00B10.1 mm",
  "\u00B10.05 mm",
  "\u00B10.01 mm",
  "\u00B10.005 mm",
  "\u00B10.001 mm",
  "Custom",
] as const;

export const LEAD_TIME_OPTIONS = [
  "1-7 days",
  "8-14 days",
  "15-30 days",
  "31-60 days",
  "60+ days",
  "Custom",
] as const;

export const SUB_CAPABILITIES: Record<string, string[]> = {
  Casting: ["Sand Casting", "Investment Casting", "Die Casting", "Gravity Casting"],
  "CNC Machining": ["CNC Turning", "CNC Milling", "VMC", "HMC", "Swiss Machining", "EDM"],
  Forging: ["Open Die Forging", "Closed Die Forging", "Hot Forging", "Cold Forging"],
  "Sheet Metal": ["Laser Cutting", "Bending", "Stamping", "Welding"],
};

export const MATERIAL_OPTIONS = [
  "Stainless Steel",
  "Carbon Steel",
  "Alloy Steel",
  "Aluminum",
  "Brass",
  "Copper",
  "Titanium",
  "Plastic",
  "Rubber",
  "Cast Iron",
] as const;

export const LANGUAGE_OPTIONS = ["English", "Hindi", "German", "French", "Chinese", "Spanish", "Other"] as const;

export const QUALITY_SYSTEM_OPTIONS = [
  "PPAP",
  "APQP",
  "FMEA",
  "SPC",
  "MSA",
  "5S",
  "Kaizen",
  "Lean Manufacturing",
  "Six Sigma",
  "TPM",
  "Other",
] as const;

export const FACTORY_PHOTO_CATEGORIES = ["Exterior", "Shop Floor", "Machines", "QC Department", "Warehouse", "Office"] as const;

export const FACTORY_PHOTO_LIMITS: Record<string, { min: number; max: number }> = {
  Exterior: { min: 1, max: 10 },
  "Shop Floor": { min: 2, max: 10 },
  Machines: { min: 0, max: 10 },
  "QC Department": { min: 1, max: 10 },
  Warehouse: { min: 1, max: 10 },
  Office: { min: 0, max: 10 },
};

export const OVERALL_FACTORY_PHOTO_LIMITS = { min: 3, max: 20 };

export const FACTORY_AREA_OPTIONS = [
  "< 100",
  "100 - 500",
  "500 - 1,000",
  "1,000 - 5,000",
  "5,000 - 10,000",
  "10,000+",
] as const;

export const FACTORY_AREA_UNITS = ["sq.m", "sq.ft", "acre", "hectare"] as const;

export const TOTAL_EMPLOYEES_OPTIONS = [
  "1 - 10",
  "11 - 50",
  "51 - 100",
  "101 - 250",
  "251 - 500",
  "501 - 1,000",
  "1,000+",
] as const;

export const ENGINEERS_OPTIONS = ["0", "1 - 5", "6 - 10", "11 - 25", "26 - 50", "50+"] as const;

export const QC_TEAM_OPTIONS = ["0", "1 - 2", "3 - 5", "6 - 10", "11 - 25", "25+"] as const;

export const RD_TEAM_SIZE_OPTIONS = ["1 - 5", "6 - 10", "11 - 25", "25+"] as const;

export const RD_SERVICE_OPTIONS = [
  "Product Design",
  "Reverse Engineering",
  "Prototype Development",
  "DFM Consultation",
  "CAD/CAM Design",
  "Testing & Validation",
] as const;

export const CERTIFICATION_PRESETS = [
  "ISO 9001",
  "ISO 14001",
  "ISO 45001",
  "IATF 16949",
  "AS9100",
  "NADCAP",
  "CE",
  "RoHS",
  "Other",
] as const;

export type CompletionSection = {
  key: string;
  label: string;
  percent: number;
  missingFields: string[];
};

export type CompletionResult = {
  overallPercent: number;
  sections: CompletionSection[];
};

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  return value !== null && value !== undefined;
}

function sectionPercent(requiredFields: string[], values: Record<string, unknown>) {
  if (!requiredFields.length) {
    return { percent: 100, missingFields: [] };
  }

  const missingFields = requiredFields.filter((field) => {
    if (field === "confirmAccountNumber") {
      return String(values.accountNumber || "") !== String(values.confirmAccountNumber || "") || !hasValue(values.confirmAccountNumber);
    }
    return !hasValue(values[field]);
  });

  return {
    percent: Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100),
    missingFields,
  };
}

export function calculateBuyerOnboardingV3Completion(values: Record<string, unknown>): CompletionResult {
  const sections = BUYER_ONBOARDING_V3_STEPS.map((step) => {
    const result = sectionPercent(step.requiredFields, values);
    return { key: step.key, label: step.title, ...result };
  });

  return {
    overallPercent: Math.round(sections.reduce((sum, section) => sum + section.percent, 0) / sections.length),
    sections,
  };
}

export function calculateSellerOnboardingV3Completion(
  values: Record<string, unknown>,
  validatedSteps: string[] = [],
): CompletionResult {
  // Phase 1 (Registration): company_verification, basic_information, registration_complete
  const phase1Steps = SELLER_ONBOARDING_V3_STEPS.filter((s) => s.phase === "registration");
  const phase1Sections = phase1Steps.map((step) => {
    const isValidated = validatedSteps.includes(step.key);
    if (!isValidated && step.requiredFields.length > 0) {
      return {
        key: step.key,
        label: step.title,
        percent: 0,
        missingFields: step.requiredFields,
      };
    }
    const result = sectionPercent(step.requiredFields, values);
    return { key: step.key, label: step.title, ...result };
  });

  // registration_complete: only 100% if all other Phase 1 steps pass
  const regCompleteIndex = phase1Sections.findIndex((s) => s.key === "registration_complete");
  if (regCompleteIndex >= 0) {
    const otherPhase1 = phase1Sections.filter((s) => s.key !== "registration_complete");
    const allPhase1Pass = otherPhase1.every((s) => s.percent >= 100);
    if (!allPhase1Pass) {
      phase1Sections[regCompleteIndex] = {
        ...phase1Sections[regCompleteIndex],
        percent: 0,
        missingFields: ["Complete all registration steps"],
      };
    }
  }

  // Phase 2 (Profile Boost): business_details, bank_details
  const phase2Sections = SELLER_ONBOARDING_V3_STEPS.filter((s) => s.phase === "profile_boost").map((step) => {
    const result = sectionPercent(step.requiredFields, values);
    return { key: step.key, label: step.title, ...result };
  });

  // Profile bonus sections (array-based scoring)
  const factoryPhotoArray = Array.isArray(values.factoryPhotos) ? (values.factoryPhotos as unknown[]) : [];
  const factoryPhotoCount = factoryPhotoArray.length;
  const factoryPhotoTarget = OVERALL_FACTORY_PHOTO_LIMITS.min;

  const profileSections: CompletionSection[] = [
    {
      key: "factory_photos",
      label: "Factory Photos",
      percent: Math.min(100, Math.round((factoryPhotoCount / factoryPhotoTarget) * 100)),
      missingFields: factoryPhotoCount >= factoryPhotoTarget ? [] : ["Factory Photos"],
    },
    scoreArraySection("machines", "Machines", values.machines, 1),
    scoreArraySection("certifications", "Certifications", values.certifications, 1),
    scoreArraySection("products", "Products", values.products, 1),
    scoreArraySection("quality_systems", "Quality Systems", values.qualitySystems, 1),
  ];

  const sections = [...phase1Sections, ...phase2Sections, ...profileSections];

  return {
    overallPercent: Math.round(sections.reduce((sum, section) => sum + section.percent, 0) / sections.length),
    sections,
  };
}

function scoreArraySection(key: string, label: string, value: unknown, targetCount: number): CompletionSection {
  const count = Array.isArray(value) ? value.length : 0;
  const percent = Math.min(100, Math.round((count / targetCount) * 100));
  return {
    key,
    label,
    percent,
    missingFields: percent >= 100 ? [] : [label],
  };
}

export function getBuyerV3MissingActionLabels(values: Record<string, unknown>) {
  const completion = calculateBuyerOnboardingV3Completion(values);
  return completion.sections.flatMap((section) =>
    section.missingFields.map((field) => ({ section: section.label, label: formatFieldLabel(field) })),
  );
}

export function getSellerV3HardGateStatus(values: Record<string, unknown>) {
  const isIndia = String(values.countryOrigin || "").toLowerCase() === "india";

  // Phase 1 gate: identity verification only (no agreements — those are Phase 2)
  const requirements: Array<{ key: string; label: string }> = [
    { key: "emailVerified", label: "Verify email" },
    { key: "mobileVerified", label: "Verify mobile" },
  ];

  if (isIndia) {
    requirements.push(
      { key: "gstVerified", label: "Verify GST" },
      { key: "gstCertificateDocumentId", label: "Upload GST certificate" },
    );
  } else {
    requirements.push(
      { key: "verificationDocumentId", label: "Upload verification certificate" },
    );
  }

  const isExporter = Array.isArray(values.sellerTypes)
    ? (values.sellerTypes as string[]).includes("Exporter")
    : String(values.sellerType || "") === "Exporter";

  if (isExporter) {
    requirements.push(
      { key: "iecNumber", label: "Add IEC number" },
      { key: "iecCertificateDocumentId", label: "Upload IEC certificate" },
    );
  }

  const missingRequirements = requirements
    .filter((req) => !hasValue(values[req.key]))
    .map((req) => req.label);

  return {
    canActivate: missingRequirements.length === 0,
    missingRequirements,
  };
}

function formatFieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
