export type UserRole = "buyer" | "seller" | "admin" | "supplier";

export type CompletionItem = {
  key: string;
  label: string;
  required: boolean;
};

export type ProfileCompletionSnapshot = {
  role: UserRole;
  percentage: number;
  completed: number;
  total: number;
  missing: CompletionItem[];
};

const BUYER_REQUIRED_FIELDS = [
  "companyName",
  "emailVerified",
  "procurementCategoryId",
  "businessType",
  "countryId",
  "cityId",
] as const;

const SELLER_REQUIRED_FIELDS = [
  "companyName",
  "emailVerified",
  "businessType",
  "countryId",
  "stateId",
  "cityId",
] as const;

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null && value !== false;
}

function describeField(field: string): string {
  const labels: Record<string, string> = {
    companyName: "Company name",
    emailVerified: "Email verification",
    procurementCategoryId: "Procurement category",
    businessType: "Business type",
    countryId: "Country",
    stateId: "State",
    cityId: "City",
  };

  return labels[field] ?? field;
}

export function normalizeProfileCompletionSnapshot(
  profile: Record<string, unknown>,
  role: UserRole,
): ProfileCompletionSnapshot {
  const requiredFields = role === "seller" ? [...SELLER_REQUIRED_FIELDS] : [...BUYER_REQUIRED_FIELDS];
  const completed = requiredFields.filter((field) => hasValue(profile[field])).length;
  const missing = requiredFields
    .filter((field) => !hasValue(profile[field]))
    .map((field) => ({ key: field, label: describeField(field), required: true }));

  return {
    role,
    percentage: requiredFields.length === 0 ? 100 : Math.round((completed / requiredFields.length) * 100),
    completed,
    total: requiredFields.length,
    missing,
  };
}

export function getProfileCompletion(
  profile: Record<string, unknown>,
  role: UserRole = "buyer",
): ProfileCompletionSnapshot {
  const normalized = normalizeProfileCompletionSnapshot(profile, role);
  if (role === "buyer") {
    return normalized;
  }

  if (role === "seller") {
    return normalized;
  }

  return normalized;
}
