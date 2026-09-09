import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and service-role key');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function count(table: string, filter?: (query: any) => any) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function main() {
  const { data: roles, error: roleError } = await supabase.from('profiles').select('role');
  if (roleError) throw roleError;
  const roleCounts = (roles || []).reduce<Record<string, number>>((result, row) => {
    const role = String(row.role || 'UNKNOWN').toUpperCase();
    result[role] = (result[role] || 0) + 1;
    return result;
  }, {});

  const { data: products, error: productError } = await supabase
    .from('seller_products')
    .select('id, product_name, profile_id, approval_status, lifecycle_status, is_published, is_visible, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (productError) throw productError;

  const { data: approvals, error: approvalError } = await supabase
    .from('product_approvals')
    .select('id, seller_product_id, status, created_at, reviewed_at')
    .order('created_at', { ascending: false });
  if (approvalError) throw approvalError;

  const bmw = (products || []).filter((product) => String(product.product_name || '').toLowerCase().includes('bmw s58'));
  const sellerProfileCount = await count('seller_profiles');
  const buyerProfileCount = await count('buyer_profiles');
  const profilesWithoutBuyer = await count('profiles', (query) => query.eq('role', 'buyer').is('deleted_at', null));

  console.log(JSON.stringify({
    users: { total: roles?.length || 0, roles: roleCounts },
    profiles: { buyerProfiles: buyerProfileCount, sellerProfiles: sellerProfileCount, buyerRoleProfiles: profilesWithoutBuyer },
    listings: {
      totalProducts: products?.length || 0,
      byApprovalStatus: (products || []).reduce<Record<string, number>>((result, product) => {
        const status = String(product.approval_status || 'UNKNOWN');
        result[status] = (result[status] || 0) + 1;
        return result;
      }, {}),
      approvals: approvals?.length || 0,
      bmw,
    },
    orphanChecks: {
      productsWithoutOwner: (products || []).filter((product) => !product.profile_id).map((product) => product.id),
      approvalsWithoutProduct: (approvals || []).filter((approval) => !(products || []).some((product) => product.id === approval.seller_product_id)).map((approval) => approval.id),
    },
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});