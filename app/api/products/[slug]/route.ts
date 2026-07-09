/**
 * Metal Hub — Product Detail API Route
 *
 * GET    /api/products/[slug]               → Get product by slug (public)
 * PUT    /api/products/[slug]               → Update product (owner/admin)
 * DELETE /api/products/[slug]               → Soft delete (owner/admin)
 */

import { NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

type RouteParams = { params: { slug: string } };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, { allowPublic: true });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const service = new ListingService(new ListingRepository(auth.supabase));
  const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const { product } = await service.getProductDetail(params.slug, requestIp);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
      { status: 404 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const service = new ListingService(new ListingRepository(auth.supabase));
  const isAdmin = ['admin', 'super_admin'].includes(auth.role);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  // Build update object (allowed fields only)
  const allowedFields = [
    'title', 'description', 'metal_type', 'grade', 'material_spec',
    'price_min', 'price_max', 'price_unit', 'currency', 'is_negotiable',
    'quantity_available', 'unit', 'moq', 'lead_time',
    'listing_type', 'listing_role', 'applications', 'keywords',
    'taxonomy_id', 'seo_title', 'seo_description', 'expires_at',
  ];

  // Admins can also update moderation fields
  const adminFields = ['is_active', 'moderation_status', 'is_featured', 'featured_until'];

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (field in body) updatePayload[field] = body[field];
  }
  if (isAdmin) {
    for (const field of adminFields) {
      if (field in body) updatePayload[field] = body[field];
    }
  }

  try {
    const data = await service.updateProduct({
      slug: params.slug,
      actorId: auth.user.id,
      isAdmin,
      updates: updatePayload,
      specifications: Array.isArray(body.specifications) ? body.specifications : undefined,
      pricingTiers: Array.isArray(body.pricing_tiers) ? body.pricing_tiers : undefined,
    });

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: 'listing_updated',
      resource: 'listings',
      resourceId: data.id,
      details: { changes: Object.keys(updatePayload), isAdmin },
      request,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only the listing owner or admin can edit' } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const service = new ListingService(new ListingRepository(auth.supabase));
  const isAdmin = ['admin', 'super_admin'].includes(auth.role);

  try {
    await service.deleteProduct({ slug: params.slug, actorId: auth.user.id, isAdmin });

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: 'listing_deleted',
      resource: 'listings',
      resourceId: params.slug,
      severity: 'warning',
      request,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
