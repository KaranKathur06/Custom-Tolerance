import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { listingStatusForQueue, normalizeUserRole, type ListingQueue } from '@/lib/admin/governance-contracts';

export const dynamic = 'force-dynamic';

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.LISTINGS_READ] });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const queue = (searchParams.get('queue') || 'pending') as ListingQueue;
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '25', 10)));
  const search = searchParams.get('search')?.trim() || '';

  if (!['pending', 'approved', 'rejected', 'all'].includes(queue)) {
    return errorResponse('VALIDATION_ERROR', 'queue must be pending, approved, rejected, or all', 400);
  }

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startedAt = Date.now();
  try {
    let approvalQuery = auth.supabase
      .from('product_approvals')
      .select('id, seller_product_id, status, created_at, reviewed_at, rejection_reason, reviewed_by', { count: 'exact' })
      .order('created_at', { ascending: false });
    const approvalStatus = listingStatusForQueue(queue);
    if (approvalStatus) approvalQuery = approvalQuery.eq('status', approvalStatus);

    const { data: approvals, count, error: approvalError } = await approvalQuery;
    if (approvalError) throw approvalError;

    const productIds = [...new Set((approvals || []).map((row) => row.seller_product_id).filter(Boolean))];
    let productQuery = auth.supabase
      .from('seller_products')
      .select('id, product_name, capability, materials, moq, lead_time, profile_id, approval_status, lifecycle_status, is_published, is_visible, created_at, updated_at');
    if (productIds.length) productQuery = productQuery.in('id', productIds);
    const { data: products, error: productError } = productIds.length ? await productQuery : { data: [], error: null };
    if (productError) throw productError;

    const productById = new Map((products || []).map((product) => [product.id, product]));
    const profileIds = [...new Set((products || []).map((product) => product.profile_id).filter(Boolean))];
    const { data: profiles, error: profileError } = profileIds.length
      ? await auth.supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const filtered = (approvals || []).flatMap((approval) => {
      const product = productById.get(approval.seller_product_id);
      if (!product) return [];
      const profile = profileById.get(product.profile_id);
      const haystack = `${product.product_name || ''} ${profile?.full_name || ''} ${profile?.email || ''}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return [];
      return [{
        id: product.id,
        approvalId: approval.id,
        title: product.product_name,
        seller: { id: product.profile_id, name: profile?.full_name || profile?.email || 'Unknown seller', email: profile?.email || null },
        moderationStatus: approval.status === 'pending' ? 'PENDING_REVIEW' : String(approval.status).toUpperCase(),
        visibilityStatus: product.is_visible ? 'VISIBLE' : 'HIDDEN',
        createdAt: product.created_at || approval.created_at,
        updatedAt: product.updated_at || approval.reviewed_at || approval.created_at,
        product,
        rejectionReason: approval.rejection_reason,
        reviewedBy: approval.reviewed_by,
      }];
    });
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    console.info('ADMIN_LISTINGS_QUERY', { requestId, adminUserId: auth.user.id, queue, search, normalizedStatus: approvalStatus, databaseModel: 'seller_products + product_approvals', recordCount: paged.length, durationMs: Date.now() - startedAt });
    return NextResponse.json({
      success: true,
      data: paged,
      pagination: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) },
    }, { headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } });
  } catch (error) {
    console.error('ADMIN_LISTINGS_QUERY_FAILED', { requestId, adminUserId: auth.user.id, error: error instanceof Error ? error.message : 'Unknown error', durationMs: Date.now() - startedAt });
    return errorResponse('DATABASE_FAILURE', 'Unable to load the listing moderation queue.', 500);
  }
}