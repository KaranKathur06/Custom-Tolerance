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
      .select('id, status, created_at, rejection_reason, notes, seller_product_id', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    const { data: approvals, count, error } = await query.range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error(error.message);

    const productIds = [...new Set((approvals ?? []).map((approval: any) => approval.seller_product_id).filter(Boolean))];
    const { data: products, error: productError } = productIds.length
      ? await auth.supabase.from('seller_products').select('id, product_name, capability, materials, moq, lead_time, profile_id, approval_status, lifecycle_status, is_published, is_visible').in('id', productIds)
      : { data: [], error: null };
    if (productError) throw new Error(productError.message);
    const productById = new Map((products ?? []).map((product: any) => [product.id, product]));
    const profileIds = [...new Set((products ?? []).map((product: any) => product.profile_id).filter(Boolean))];
    const { data: profiles, error: profileError } = profileIds.length
      ? await auth.supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
      : { data: [], error: null };
    if (profileError) throw new Error(profileError.message);
    const profileById = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const { data: images, error: imageError } = productIds.length
      ? await auth.supabase.from('product_images').select('seller_product_id, url, is_primary, display_order').in('seller_product_id', productIds).order('display_order', { ascending: true })
      : { data: [], error: null };
    if (imageError) throw new Error(imageError.message);
    const imageByProduct = new Map<string, any>();
    for (const image of images ?? []) {
      if (!imageByProduct.has(image.seller_product_id) || image.is_primary) imageByProduct.set(image.seller_product_id, image);
    }

    const data = (approvals ?? []).map((approval: any) => {
      const product = productById.get(approval.seller_product_id);
      const profile = product ? profileById.get(product.profile_id) : null;
      const primaryImage = imageByProduct.get(approval.seller_product_id);
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
        product: product ?? null,
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
