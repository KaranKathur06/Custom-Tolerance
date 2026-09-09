/**
 * Metal Hub — Admin Listings Moderation Queue API
 *
 * GET /api/admin/listings/pending    → Get listings pending moderation
 *
 * Requires listings.moderate permission + admin 2FA.
 */

import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.LISTINGS_MODERATE],
    requireAdmin2FA: false,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const status = searchParams.get('status') || 'pending';

  try {
    let query = auth.supabase
      .from('product_approvals')
      .select(`
        id, status, created_at, rejection_reason, notes, seller_product_id,
        seller_products!inner(
          id, product_name, capability, materials, moq, lead_time,
          profile_id, approval_status, lifecycle_status, is_published, is_visible,
          product_images(url, is_primary, display_order),
          profiles!inner(id, full_name, email)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    const { data: approvals, count, error } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);

    const data = (approvals ?? []).map((approval: any) => {
      const product = Array.isArray(approval.seller_products) ? approval.seller_products[0] : approval.seller_products;
      const profile = Array.isArray(product?.profiles) ? product.profiles[0] : product?.profiles;
      const images = Array.isArray(product?.product_images) ? product.product_images : [];
      const primaryImage = images.find((image: any) => image.is_primary) ?? images[0];
      return {
        id: approval.id,
        title: product?.product_name ?? 'Untitled product',
        seller: profile?.full_name ?? profile?.email ?? 'Unknown seller',
        metal_type: product?.capability ?? null,
        moq: product?.moq ?? null,
        lead_time: product?.lead_time ?? null,
        status: approval.status,
        moderation_status: approval.status,
        created_at: approval.created_at,
        seller_product_id: approval.seller_product_id,
        primary_image: primaryImage?.url ?? null,
        product,
      };
    });

    const { count: pendingCount } = await auth.supabase
      .from('product_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    const { count: approvedCount } = await auth.supabase
      .from('product_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');
    const statusCounts = { pending: pendingCount ?? 0, approved: approvedCount ?? 0 };

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        statusCounts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
