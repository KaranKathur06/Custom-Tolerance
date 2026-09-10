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

  const [
    { data: product, error: productError },
    { data: approvals, error: approvalError },
    { data: images, error: imageError },
    { data: capabilities, error: capabilitiesError },
    { data: industries, error: industriesError },
    { data: materials, error: materialsError },
    { data: grades, error: gradesError },
    { data: paymentTerms, error: paymentTermsError },
    { data: incoterms, error: incotermsError },
  ] = await Promise.all([
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
    database.from('product_capabilities').select('capability_id').eq('seller_product_id', productId),
    database.from('product_industries').select('industry_id').eq('seller_product_id', productId),
    database.from('product_materials').select('material_name').eq('seller_product_id', productId),
    database.from('product_grades').select('grade_name').eq('seller_product_id', productId),
    database.from('product_payment_terms').select('payment_term_id').eq('seller_product_id', productId),
    database.from('product_incoterms').select('incoterm_id').eq('seller_product_id', productId),
  ]);

  if (productError || !product) {
    return NextResponse.json({ success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } }, { status: 404 });
  }

  // The main product row is authoritative. Relation tables were introduced
  // incrementally, so a missing table or policy must not hide the review page.
  const relationErrors = { approvalError, imageError, capabilitiesError, industriesError, materialsError, gradesError, paymentTermsError, incotermsError };
  if (Object.values(relationErrors).some(Boolean)) {
    console.warn('ADMIN_LISTING_DETAIL_RELATION_FALLBACK', { productId, relationErrors });
  }

  const { data: profile } = product.profile_id
    ? await database.from('profiles').select('id, full_name, email').eq('id', product.profile_id).maybeSingle()
    : { data: null };

  return NextResponse.json({
    success: true,
    data: {
      product: { ...product, profiles: profile },
      approvals: approvalError ? [] : approvals ?? [],
      images: imageError ? [] : images ?? [],
      relations: { capabilities: capabilities ?? [], industries: industries ?? [], materials: materials ?? [], grades: grades ?? [], paymentTerms: paymentTerms ?? [], incoterms: incoterms ?? [] },
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}