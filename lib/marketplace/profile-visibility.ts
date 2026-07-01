/**
 * Field-level profile visibility engine.
 * Visibility is stored per-field in profile_privacy_settings and enforced server-side.
 */

export const PROFILE_VISIBILITY_LEVELS = [
  "PUBLIC",
  "MEMBERS_ONLY",
  "VERIFIED_SUPPLIERS",
  "PRIVATE",
] as const;
export type ProfileVisibilityLevel = (typeof PROFILE_VISIBILITY_LEVELS)[number];

export type ProfileViewerContext = {
  isAuthenticated: boolean;
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  hasContactUnlock?: boolean;
  /** True when the viewer is a verified/approved supplier on the marketplace */
  isVerifiedSupplier?: boolean;
};

/** Fields that must never be exposed on public profiles regardless of settings */
export const ALWAYS_PRIVATE_FIELDS = [
  "panNumber",
  "pan",
  "aadhaar",
  "bankAccountNumber",
  "accountNumber",
  "ifscCode",
  "cancelledCheque",
  "gstCertificateUrl",
  "internalNotes",
  "adminComments",
] as const;

export type SellerPrivacyFieldKey =
  | "mobile"
  | "whatsapp"
  | "email"
  | "alternateNumber"
  | "website"
  | "linkedin"
  | "factoryAddress"
  | "gst"
  | "iec"
  | "cin"
  | "revenue"
  | "pan";

export type BuyerPrivacyFieldKey =
  | "mobile"
  | "whatsapp"
  | "email"
  | "companyName"
  | "website"
  | "linkedin"
  | "country"
  | "state"
  | "city"
  | "industries"
  | "companyTypes"
  | "annualProcurementBudget"
  | "importExperience"
  | "procurementMethods"
  | "preferredPaymentTerms"
  | "preferredIncoterms"
  | "categoryInterests"
  | "countriesImportedFrom";

export const SELLER_PRIVACY_DEFAULTS: Record<
  SellerPrivacyFieldKey,
  ProfileVisibilityLevel
> = {
  mobile: "PRIVATE",
  whatsapp: "PRIVATE",
  email: "MEMBERS_ONLY",
  alternateNumber: "PRIVATE",
  website: "PUBLIC",
  linkedin: "PUBLIC",
  factoryAddress: "MEMBERS_ONLY",
  gst: "PUBLIC",
  iec: "PUBLIC",
  cin: "PUBLIC",
  revenue: "PRIVATE",
  pan: "PRIVATE",
};

export const BUYER_PRIVACY_DEFAULTS: Record<
  BuyerPrivacyFieldKey,
  ProfileVisibilityLevel
> = {
  mobile: "PRIVATE",
  whatsapp: "PRIVATE",
  email: "MEMBERS_ONLY",
  companyName: "PUBLIC",
  website: "PUBLIC",
  linkedin: "PUBLIC",
  country: "PUBLIC",
  state: "PUBLIC",
  city: "PUBLIC",
  industries: "PUBLIC",
  companyTypes: "PUBLIC",
  annualProcurementBudget: "VERIFIED_SUPPLIERS",
  importExperience: "MEMBERS_ONLY",
  procurementMethods: "MEMBERS_ONLY",
  preferredPaymentTerms: "VERIFIED_SUPPLIERS",
  preferredIncoterms: "MEMBERS_ONLY",
  categoryInterests: "PUBLIC",
  countriesImportedFrom: "PUBLIC",
};

export const PUBLIC_SELLER_FIELDS = [
  "companyName",
  "tagline",
  "industry",
  "businessCategory",
  "companyType",
  "foundedYear",
  "aboutCompany",
  "country",
  "state",
  "city",
  "certifications",
  "capabilities",
  "machines",
  "materials",
  "moq",
  "leadTime",
  "capacity",
  "employeeCount",
  "exportCountries",
] as const;

export function visibilityKeyForField(field: string): string {
  return `${field}Visibility`;
}

export function canViewField(
  visibility: ProfileVisibilityLevel,
  viewer: ProfileViewerContext,
): boolean {
  if (viewer.isOwner || viewer.isAdmin) return true;
  if (visibility === "PUBLIC") return true;
  if (visibility === "MEMBERS_ONLY")
    return viewer.isAuthenticated && viewer.isMember;
  if (visibility === "VERIFIED_SUPPLIERS")
    return Boolean(viewer.isVerifiedSupplier);
  if (visibility === "PRIVATE") return viewer.hasContactUnlock === true;
  return false;
}

export function filterProfileFields<T extends Record<string, unknown>>(
  data: T,
  privacyMap: Record<string, ProfileVisibilityLevel>,
  viewer: ProfileViewerContext,
  fieldVisibilityPairs: Array<{ valueKey: string; privacyKey: string }>,
): Partial<T> {
  const result: Record<string, unknown> = { ...data };

  for (const { valueKey, privacyKey } of fieldVisibilityPairs) {
    if (
      ALWAYS_PRIVATE_FIELDS.includes(
        valueKey as (typeof ALWAYS_PRIVATE_FIELDS)[number],
      )
    ) {
      delete result[valueKey];
      continue;
    }

    const visibility =
      privacyMap[privacyKey] ?? privacyMap[valueKey] ?? "PRIVATE";
    if (!canViewField(visibility, viewer)) {
      delete result[valueKey];
    }
  }

  return result as Partial<T>;
}

export function buildPrivacySummary(
  privacyMap: Record<string, ProfileVisibilityLevel>,
  labels: Record<string, string>,
): {
  public: string[];
  membersOnly: string[];
  private: string[];
} {
  const summary = {
    public: [] as string[],
    membersOnly: [] as string[],
    private: [] as string[],
  };

  for (const [key, visibility] of Object.entries(privacyMap)) {
    const label = labels[key] ?? key;
    if (visibility === "PUBLIC") summary.public.push(label);
    else if (visibility === "MEMBERS_ONLY") summary.membersOnly.push(label);
    else summary.private.push(label);
  }

  return summary;
}

export const SELLER_PRIVACY_FIELD_LABELS: Record<
  SellerPrivacyFieldKey,
  string
> = {
  mobile: "Mobile",
  whatsapp: "WhatsApp",
  email: "Email",
  alternateNumber: "Alternate number",
  website: "Website",
  linkedin: "LinkedIn",
  factoryAddress: "Factory address",
  gst: "GST",
  iec: "IEC",
  cin: "CIN",
  revenue: "Annual revenue",
  pan: "PAN",
};

export const BUYER_PRIVACY_FIELD_LABELS: Record<BuyerPrivacyFieldKey, string> =
  {
    mobile: "Mobile",
    whatsapp: "WhatsApp",
    email: "Email",
    companyName: "Company name",
    website: "Website",
    linkedin: "LinkedIn",
    country: "Country",
    state: "State",
    city: "City",
    industries: "Industries",
    companyTypes: "Company type",
    annualProcurementBudget: "Annual procurement budget",
    importExperience: "Import experience",
    procurementMethods: "Procurement methods",
    preferredPaymentTerms: "Preferred payment terms",
    preferredIncoterms: "Preferred incoterms",
    categoryInterests: "Category interests",
    countriesImportedFrom: "Countries imported from",
  };

export function mergePrivacyWithDefaults(
  role: "seller" | "buyer",
  stored?: Record<string, ProfileVisibilityLevel> | null,
): Record<string, ProfileVisibilityLevel> {
  const defaults =
    role === "seller" ? SELLER_PRIVACY_DEFAULTS : BUYER_PRIVACY_DEFAULTS;
  return { ...defaults, ...stored };
}
