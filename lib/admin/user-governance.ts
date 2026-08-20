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
  const role = normalizeGovernanceRole(value);
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

export function normalizeGovernanceRole(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'buyer';
  const normalized = value.trim().toLowerCase().replaceAll(' ', '_');
  return normalized === 'both' ? 'both' : normalizeStoredRole(normalized);
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
    role: normalizeGovernanceRole(profile.role) as GovernanceRole,
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

  if (error || !profile) {
    const { data: directoryUser } = await supabase
      .from('admin_user_directory')
      .select('id, full_name, email, phone, role, auth_role, avatar_url, verification_status, created_at, last_login, enforcement_status, profile_status, deleted_at')
      .eq('id', userId)
      .maybeSingle();
    if (!directoryUser) return null;
    return {
      user: {
        id: directoryUser.id,
        email: directoryUser.email,
        fullName: directoryUser.full_name,
        phone: directoryUser.phone,
        avatarUrl: directoryUser.avatar_url,
        createdAt: directoryUser.created_at,
        lastLoginAt: directoryUser.last_login,
        deletedAt: directoryUser.deleted_at,
      },
      role: normalizeGovernanceRole(directoryUser.role ?? directoryUser.auth_role) as GovernanceRole,
      accountStatus: directoryUser.deleted_at ? 'deleted' : 'active',
      enforcementStatus: directoryUser.enforcement_status ?? 'normal',
      profileStatus: directoryUser.profile_status ?? 'incomplete',
      verificationStatus: directoryUser.verification_status ?? 'pending',
      buyerProfile: null,
      sellerProfile: null,
    };
  }

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
  options: { page: number; limit: number; role?: string | null; status?: string | null; search?: string | null },
) {
  let query = supabase
    .from('admin_user_directory')
    .select('id, email, full_name, phone, role, auth_role, avatar_url, verification_status, created_at, last_login, enforcement_status, profile_status, deleted_at', { count: 'exact' });

  if (options.role) query = query.eq('role', normalizeStoredRole(options.role));
  if (options.status && ['normal', 'suspended', 'banned'].includes(options.status)) query = query.eq('enforcement_status', options.status);
  if (options.search) {
    const search = options.search.replaceAll(',', ' ');
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((options.page - 1) * options.limit, options.page * options.limit - 1);

  if (error) throw error;

  const directoryRows = (data ?? []) as Array<{
    id: string; email: string | null; full_name: string | null; phone: string | null; role: string | null; auth_role: string | null;
    avatar_url: string | null; verification_status: string; created_at: string; last_login: string | null;
    enforcement_status: EnforcementStatus; profile_status: ProfileStatus | null; deleted_at: string | null;
  }>;
  const contexts = await Promise.all(directoryRows.map(async (directoryUser) => {
    const profile: ProfileRow = {
      id: directoryUser.id,
      email: directoryUser.email,
      full_name: directoryUser.full_name,
      phone: directoryUser.phone,
      role: directoryUser.role ?? directoryUser.auth_role ?? 'buyer',
      profile_status: directoryUser.profile_status ?? 'incomplete',
      verification_status: directoryUser.verification_status,
      avatar_url: directoryUser.avatar_url,
      created_at: directoryUser.created_at,
      updated_at: directoryUser.created_at,
      deleted_at: directoryUser.deleted_at,
      enforcement_status: directoryUser.enforcement_status,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
      banned_at: null,
      banned_by: null,
      ban_reason: null,
    };
    const [buyerResult, sellerResult] = await Promise.all([
      supabase.from('buyer_profiles').select('id, company_id, profile_completion_percent, verification_status').eq('profile_id', directoryUser.id).maybeSingle(),
      supabase.from('seller_profiles').select('id, company_id, company_name, profile_completion_percent, verification_status').eq('profile_id', directoryUser.id).maybeSingle(),
    ]);
    return toGovernanceContext(profile, {
      buyer: (buyerResult.data as Record<string, unknown> | null) ?? null,
      seller: (sellerResult.data as Record<string, unknown> | null) ?? null,
      lastLoginAt: directoryUser.last_login,
    });
  }));

  return { contexts, total: count ?? 0 };
}