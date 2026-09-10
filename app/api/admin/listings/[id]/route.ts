import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.LISTINGS_READ] });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const productId = params.id;
  const database = createSupabaseServiceRoleClient() || auth.supabase;

  const [{ data: product, error: productError }, { data: approvals, error: approvalError }, { data: images, error: imageError }] = await Promise.all([
    database
      .from('seller_products')
      .select('*')
      .eq('id', productId)
      .maybeSingle(),
    database
      .from('product_approvals')
      .select('id, status, created_at, reviewed_at, reviewed_by, rejection_reason, notes, seller_product_id')
      .eq('seller_product_id', productId)
      .order('created_at', { ascending: false }),
    database
      .from('product_images')
      .select('id, url, is_primary, display_order')
      .eq('seller_product_id', productId)
      .order('display_order', { ascending: true }),
  ]);

  if (productError || !product) {
    return NextResponse.json({ success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } }, { status: 404 });
  }

  if (approvalError || imageError) {
    console.error('ADMIN_LISTING_DETAIL_FAILED', { productId, approvalError, imageError });
    return NextResponse.json({ success: false, error: { code: 'DATABASE_FAILURE', message: 'Unable to load product details.' } }, { status: 500 });
  }

  const { data: profile } = product.profile_id
    ? await database.from('profiles').select('id, full_name, email').eq('id', product.profile_id).maybeSingle()
    : { data: null };

  return NextResponse.json({
    success: true,
    data: { product: { ...product, profiles: profile }, approvals: approvals ?? [], images: images ?? [] },
  }, { headers: { 'Cache-Control': 'no-store' } });
}