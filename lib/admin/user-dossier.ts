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
  metrics: Record<string, number | string | null>;
};

const BUYER_PROFILE_FIELDS: Record<string, string> = {
  procurement_category_id: 'Primary procurement category',
  annual_procurement_volume: 'Annual procurement volume',
  profile_completion_percent: 'Profile completion',
  verification_status: 'Verification status',
  trust_level: 'Trust level',
  company_id: 'Company',
};

const SELLER_PROFILE_FIELDS: Record<string, string> = {
  profile_completion_percent: 'Profile completion',
  verification_status: 'Verification status',
  trust_level: 'Trust level',
  onboarding_status: 'Onboarding status',
  company_id: 'Company',
};

const BUYER_COMPANY_FIELDS: Record<string, string> = {
  name: 'Company name',
  slug: 'Company slug',
  owner_id: 'Owner',
  gst_number: 'GST number',
  pan_number: 'PAN number',
  business_type: 'Business type',
  website: 'Website',
  linkedin_url: 'LinkedIn URL',
  company_size: 'Company size',
  country_id: 'Country',
  state_id: 'State',
  city_id: 'City',
  description: 'Company description',
  company_description: 'Company description',
  year_established: 'Established year',
  employee_count: 'Employee count',
  number_of_employees: 'Number of employees',
};

const SELLER_COMPANY_FIELDS: Record<string, string> = {
  ...BUYER_COMPANY_FIELDS,
  legal_business_name: 'Legal business name',
  full_address: 'Business address',
  factory_address: 'Factory address',
  annual_production_capacity: 'Annual production capacity',
  export_capability: 'Export capability',
  response_rate: 'Response rate',
  avg_response_hours: 'Average response hours',
  completion_rate: 'Completion rate',
  iso_certified: 'ISO certified',
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

export function normalizeDossierValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}