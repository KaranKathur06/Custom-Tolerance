import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeStoredRole } from '@/lib/auth/rbac';

export type AccountStatus = 'active' | 'deleted';
export type EnforcementStatus = 'normal' | 'suspended' | 'banned';
export type ProfileStatus = 'incomplete' | 'in_progress' | 'complete';
export type GovernanceRole =
  | 'buyer'
  | 'seller'
  | 'both'
  | 'admin'
  | 'super_admin'
  | 'moderator'
  | 'support_agent'
  | 'supplier_success'
  | 'finance'
  | 'marketing';

export type AdminUserGovernanceContext = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    deletedAt: string | null;
  };
  role: GovernanceRole;
  accountStatus: AccountStatus;
  enforcementStatus: EnforcementStatus;
  profileStatus: ProfileStatus;
  verificationStatus: string;
  buyerProfile: Record<string, unknown> | null;
  sellerProfile: Record<string, unknown> | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  profile_status: ProfileStatus;
  verification_status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  enforcement_status: EnforcementStatus | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  ban_reason: string | null;
};

export function displayRole(value: unknown): string {
  const role = normalizeStoredRole(value);
  const labels: Record<string, string> = {
    buyer: 'Buyer',
    seller: 'Seller',
    both: 'Buyer & Seller',
    admin: 'Admin',
    super_admin: 'Super Admin',
    moderator: 'Moderator',
    support_agent: 'Support Agent',
    supplier_success: 'Supplier Success',
    finance: 'Finance',
    marketing: 'Marketing',
  };
  return labels[role] ?? role.replaceAll('_', ' ');
}

function toGovernanceContext(profile: ProfileRow, related: { buyer: Record<string, unknown> | null; seller: Record<string, unknown> | null; lastLoginAt?: string | null }): AdminUserGovernanceContext {
  const enforcementStatus = profile.enforcement_status ?? 'normal';
  return {
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      createdAt: profile.created_at,
      lastLoginAt: related.lastLoginAt ?? null,
      deletedAt: profile.deleted_at,
    },
    role: normalizeStoredRole(profile.role) as GovernanceRole,
    accountStatus: profile.deleted_at ? 'deleted' : 'active',
    enforcementStatus,
    profileStatus: profile.profile_status,
    verificationStatus: profile.verification_status,
    buyerProfile: related.buyer,
    sellerProfile: related.seller,
  };
}

export async function getUserGovernanceContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminUserGovernanceContext | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, profile_status, verification_status, avatar_url, created_at, updated_at, deleted_at, enforcement_status, suspended_at, suspended_by, suspension_reason, banned_at, banned_by, ban_reason')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return null;

  const [buyerResult, sellerResult] = await Promise.all([
    supabase.from('buyer_profiles').select('*').eq('profile_id', userId).maybeSingle(),
    supabase.from('seller_profiles').select('*').eq('profile_id', userId).maybeSingle(),
  ]);

  return toGovernanceContext(profile as ProfileRow, {
    buyer: (buyerResult.data as Record<string, unknown> | null) ?? null,
    seller: (sellerResult.data as Record<string, unknown> | null) ?? null,
  });
}

export async function listUserGovernanceContexts(
  supabase: SupabaseClient,
  options: { page: number; limit: number; role?: string | null; search?: string | null },
) {
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, profile_status, verification_status, avatar_url, created_at, updated_at, deleted_at, enforcement_status, suspended_at, suspended_by, suspension_reason, banned_at, banned_by, ban_reason', { count: 'exact' });

  if (options.role) query = query.eq('role', normalizeStoredRole(options.role));
  if (options.search) {
    const search = options.search.replaceAll(',', ' ');
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);

  if (error) throw error;

  const profiles = (data ?? []) as ProfileRow[];
  const contexts = await Promise.all(profiles.map(async (profile) => {
    const [buyerResult, sellerResult] = await Promise.all([
      supabase.from('buyer_profiles').select('id, company_id, profile_completion_percent, verification_status').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('seller_profiles').select('id, company_id, company_name, profile_completion_percent, verification_status').eq('profile_id', profile.id).maybeSingle(),
    ]);
    return toGovernanceContext(profile, {
      buyer: (buyerResult.data as Record<string, unknown> | null) ?? null,
      seller: (sellerResult.data as Record<string, unknown> | null) ?? null,
    });
  }));

  return { contexts, total: count ?? 0 };
}