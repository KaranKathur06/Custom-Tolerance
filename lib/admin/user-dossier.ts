import type { GovernanceRole } from '@/lib/admin/user-governance';

export type AdminDossierRole = 'buyer' | 'seller' | 'both' | 'admin' | 'unknown';

export type DossierField = {
  key: string;
  label: string;
  value: unknown;
};

export type AdminUserDossier = {
  role: AdminDossierRole;
  profileType: AdminDossierRole;
  profile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  sellerExtended?: Record<string, unknown> | null;
  buyerIndustries?: string[];
  buyerCategories?: string[];
  buyerImportCountries?: string[];
  secondaryProfile?: Record<string, unknown> | null;
  secondaryCompany?: Record<string, unknown> | null;
  secondarySellerExtended?: Record<string, unknown> | null;
  metrics: Record<string, number | string | null>;
};

// ── Buyer profile fields (from buyer_profiles table) ────────────────────────
const BUYER_PROFILE_FIELDS: Record<string, string> = {
  primary_procurement_category_id: 'Primary procurement category',
  procurement_category_id: 'Primary procurement category',
  annual_procurement_volume: 'Annual procurement volume',
  profile_completion_percent: 'Profile completion',
  verification_status: 'Verification status',
  trust_level: 'Trust level',
  company_id: 'Company',
};

// ── Buyer preferences fields (from buyer_preferences table) ─────────────────
export const BUYER_PREFERENCE_FIELDS: Record<string, string> = {
  company_type: 'Business type',
  contact_designation: 'Contact designation',
  business_email: 'Business email',
  mobile_number: 'Mobile number',
  company_website: 'Company website',
  annual_procurement_budget: 'Annual procurement budget',
  order_frequency: 'Order frequency',
  procurement_methods: 'Procurement methods',
  import_experience: 'Import experience',
  preferred_incoterms: 'Preferred Incoterms',
  preferred_payment_terms: 'Preferred payment terms',
  procurement_team_size: 'Procurement team size',
  company_description: 'Company description',
  email_verified: 'Email verification',
  mobile_verified: 'Mobile verification',
  completion_percent: 'Profile completion',
};

// ── Seller profile fields (from seller_profiles table) ──────────────────────
const SELLER_PROFILE_FIELDS: Record<string, string> = {
  profile_completion_percent: 'Profile completion',
  verification_status: 'Verification status',
  trust_level: 'Trust level',
  onboarding_status: 'Onboarding status',
  review_status: 'Review status',
  production_capacity: 'Production capacity',
  certifications: 'Certifications',
  accepts_rfqs: 'Accepts RFQs',
  response_time_hours: 'Response time (hours)',
  seller_types: 'Seller types',
  business_nature: 'Business nature',
  industries_served: 'Industries served',
  capabilities: 'Capabilities',
  total_employees: 'Total employees',
  address_line_1: 'Registered address',
  postal_code: 'Postal code',
};

// ── Buyer company fields (shared business attributes only) ──────────────────
const BUYER_COMPANY_FIELDS: Record<string, string> = {
  name: 'Company name',
  slug: 'Company slug',
  gst_number: 'GST number',
  pan_number: 'PAN number',
  business_type: 'Business type',
  website: 'Website',
  linkedin_url: 'LinkedIn URL',
  country_id: 'Country',
  state_id: 'State',
  city_id: 'City',
  company_description: 'Company description',
  year_established: 'Established year',
  number_of_employees: 'Number of employees',
};

// ── Seller company fields (shared + seller legal identity) ──────────────────
const SELLER_COMPANY_FIELDS: Record<string, string> = {
  ...BUYER_COMPANY_FIELDS,
  legal_business_name: 'Legal business name',
  full_address: 'Business address',
  factory_address: 'Factory address',
};

// ── Manufacturing & Capabilities (seller-only, from companies + seller_profiles) ─
const SELLER_MANUFACTURING_FIELDS: Record<string, string> = {
  annual_production_capacity: 'Annual production capacity',
  export_capability: 'Export capability',
  factory_address: 'Factory address',
  iso_certified: 'ISO certified',
  production_capacity: 'Production capacity',
  certifications: 'Certifications',
};

// ── Seller Performance (seller-only operational metrics from companies) ──────
const SELLER_PERFORMANCE_FIELDS: Record<string, string> = {
  response_rate: 'Response rate',
  avg_response_hours: 'Average response hours',
  completion_rate: 'Completion rate',
};

export function dossierRole(role: GovernanceRole): AdminDossierRole {
  if (role === 'buyer' || role === 'seller' || role === 'both' || role === 'admin') return role;
  return 'unknown';
}

export function selectDossierFields(
  record: Record<string, unknown> | null,
  role: 'buyer' | 'seller',
  domain: 'profile' | 'company',
): DossierField[] {
  if (!record) return [];
  const labels = domain === 'profile'
    ? role === 'buyer' ? BUYER_PROFILE_FIELDS : SELLER_PROFILE_FIELDS
    : role === 'buyer' ? BUYER_COMPANY_FIELDS : SELLER_COMPANY_FIELDS;

  return Object.entries(labels)
    .filter(([key]) => key in record)
    .map(([key, label]) => ({ key, label, value: record[key] }));
}

/**
 * Select manufacturing/capability fields from a merged record
 * of company + seller_profiles data.
 */
export function selectSellerManufacturingFields(
  company: Record<string, unknown> | null,
  sellerProfile: Record<string, unknown> | null,
): DossierField[] {
  const merged: Record<string, unknown> = { ...company, ...sellerProfile };
  return Object.entries(SELLER_MANUFACTURING_FIELDS)
    .filter(([key]) => key in merged)
    .map(([key, label]) => ({ key, label, value: merged[key] }));
}

/**
 * Select seller performance fields from the companies table.
 */
export function selectSellerPerformanceFields(
  company: Record<string, unknown> | null,
): DossierField[] {
  if (!company) return [];
  return Object.entries(SELLER_PERFORMANCE_FIELDS)
    .filter(([key]) => key in company)
    .map(([key, label]) => ({ key, label, value: company[key] }));
}

/**
 * Normalize a dossier value for display.
 *
 * - undefined → '—' (field was not queried / not applicable)
 * - null / empty string → 'Not provided' (field exists but no value)
 * - boolean → 'Yes' / 'No'
 * - array → comma-joined or 'Not provided' if empty
 * - object → JSON stringified
 */
export function normalizeDossierValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}