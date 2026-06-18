export const BUYER_ONBOARDING_V3_FLOW_KEY = "buyer_onboarding_v3";
export const SELLER_ONBOARDING_V3_FLOW_KEY = "seller_onboarding_v3";
export const ONBOARDING_V3_FLOW_VERSION = 3;

export type BuyerOnboardingV3StepKey =
  | "buyer_registration"
  | "business_information"
  | "profile_completion";

export type SellerOnboardingV3StepKey =
  | "gst_verification"
  | "basic_information"
  | "business_details"
  | "bank_financial_verification"
  | "registration_complete"
  | "profile_completion";

export type OnboardingStepDefinition<TStepKey extends string> = {
  key: TStepKey;
  title: string;
  goal: string;
  requiredFields: string[];
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
    key: "gst_verification",
    title: "GST Verification",
    goal: "Start with verified business identity before collecting seller details.",
    requiredFields: ["gstNumber", "gstVerified", "legalBusinessName"],
  },
  {
    key: "basic_information",
    title: "Basic Information",
    goal: "Confirm contact, email, mobile, and factory address.",
    requiredFields: [
      "contactPersonName",
      "designation",
      "mobileNumber",
      "mobileVerified",
      "businessEmail",
      "emailVerified",
      "factoryAddress",
    ],
  },
  {
    key: "business_details",
    title: "Business Details",
    goal: "Describe production capabilities, materials, capacity, export markets, and languages.",
    requiredFields: [
      "sellerType",
      "mainIndustry",
      "capabilityCategories",
      "subCapabilities",
      "materials",
      "monthlyCapacity",
      "moq",
      "leadTime",
      "factoryArea",
      "shopFloorEmployees",
      "engineers",
      "qcTeamSize",
    ],
  },
  {
    key: "bank_financial_verification",
    title: "Bank and Financial Verification",
    goal: "Complete KYC requirements needed for marketplace activation.",
    requiredFields: [
      "bankName",
      "accountHolderName",
      "accountNumber",
      "confirmAccountNumber",
      "ifscCode",
      "branchName",
      "panNumber",
      "panUploaded",
      "factoryLicenseUploaded",
      "sellerAgreement",
      "termsAccepted",
      "privacyAccepted",
      "kycConsent",
    ],
  },
  {
    key: "registration_complete",
    title: "Registration Complete",
    goal: "Review activation status and continue to profile completion.",
    requiredFields: [],
  },
  {
    key: "profile_completion",
    title: "Seller Profile Completion",
    goal: "Add factory evidence, machines, certifications, export history, and quality systems.",
    requiredFields: [],
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
  "OEM",
  "Contract Manufacturer",
  "Job Work Provider",
  "Trader",
  "Distributor",
] as const;

export const CAPABILITY_CATEGORIES = [
  "CNC Machining",
  "Casting",
  "Forging",
  "Sheet Metal",
  "Injection Molding",
  "Fabrication",
  "Extrusion",
  "Fasteners",
  "Rubber Molding",
  "Plastic Molding",
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

export const LANGUAGE_OPTIONS = ["English", "Hindi", "German", "French", "Chinese", "Spanish"] as const;
export const QUALITY_SYSTEM_OPTIONS = ["PPAP", "APQP", "FMEA", "SPC", "MSA", "5S", "Kaizen", "Lean Manufacturing"] as const;
export const FACTORY_PHOTO_CATEGORIES = ["Exterior", "Shop Floor", "Machines", "QC Department", "Warehouse", "Office"] as const;

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
      return values.accountNumber !== values.confirmAccountNumber || !hasValue(values.confirmAccountNumber);
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

export function calculateSellerOnboardingV3Completion(values: Record<string, unknown>): CompletionResult {
  const baseSections = SELLER_ONBOARDING_V3_STEPS.slice(0, 4).map((step) => {
    const result = sectionPercent(step.requiredFields, values);
    return { key: step.key, label: step.title, ...result };
  });

  const profileSections: CompletionSection[] = [
    scoreArraySection("factory_photos", "Factory Photos", values.factoryPhotos, 3),
    scoreArraySection("machines", "Machines", values.machines, 1),
    scoreArraySection("certifications", "Certifications", values.certifications, 1),
    scoreArraySection("export_experience", "Export Experience", values.exportExperience, 1),
    scoreArraySection("quality_systems", "Quality Systems", values.qualitySystems, 1),
  ];

  const sections = [...baseSections, ...profileSections];

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
  const requirements = [
    ["gstVerified", "Verify GST"],
    ["panUploaded", "Upload PAN"],
    ["bankVerified", "Verify bank account"],
    ["factoryLicenseUploaded", "Upload factory license"],
    ["emailVerified", "Verify email"],
    ["mobileVerified", "Verify mobile"],
    ["sellerAgreement", "Accept seller agreement"],
    ["termsAccepted", "Accept terms"],
    ["privacyAccepted", "Accept privacy policy"],
    ["kycConsent", "Accept KYC consent"],
  ] as const;

  const missingRequirements = requirements
    .filter(([key]) => !hasValue(values[key]))
    .map(([, label]) => label);

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
