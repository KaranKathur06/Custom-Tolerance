/**
 * Metal Hub — Products API Route
 *
 * GET  /api/products       → List products (public, filtered, paginated)
 * POST /api/products       → Create a new product listing (sellers only)
 */

import { NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { RATE_LIMITS } from '@/lib/auth/rate-limiter';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

export async function GET(request: Request) {
  // Public endpoint — parse user if present but don't require auth
  const auth = await protectApiRoute(request, { allowPublic: true });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const sort = searchParams.get('sort') || 'created_at';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  // Filters
  const metalType = searchParams.get('metal_type');
  const taxonomyId = searchParams.get('taxonomy_id');
  const listingType = searchParams.get('listing_type');
  const listingRole = searchParams.get('listing_role');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const isFeatured = searchParams.get('featured');
  const search = searchParams.get('search');
  const sellerId = searchParams.get('seller_id');
  const companyId = searchParams.get('company_id');

  const service = new ListingService(new ListingRepository(auth.supabase));

  try {
    const { data, count } = await service.searchListings({
      page,
      limit,
      sort,
      order,
      metalType: metalType || undefined,
      taxonomyId: taxonomyId || undefined,
      listingType: listingType || undefined,
      listingRole: listingRole || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isFeatured: isFeatured === 'true',
      search: search || undefined,
      sellerId: sellerId || undefined,
      companyId: companyId || undefined,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.LISTINGS_CREATE],
    rateLimit: RATE_LIMITS.PRODUCT_CREATE,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.title || body.title.length < 3) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required (min 3 characters)' } },
      { status: 400 },
    );
  }

  // Get seller profile
  const { data: sellerProfile } = await auth.supabase
    .from('seller_profiles')
    .select('id, company_id, verification_status')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Seller profile required to create listings' } },
      { status: 403 },
    );
  }

  const isDevTrust = process.env.NEXT_PUBLIC_DEVELOPMENT_TRUST_MODE === 'true';
  const isVerified = sellerProfile.verification_status === 'approved';

  const listingService = new ListingService(new ListingRepository(auth.supabase));

  try {
    const result = await listingService.createListing({
      actorId: auth.user.id,
      title: body.title,
      description: body.description || null,
      metalType: body.metal_type || null,
      grade: body.grade || null,
      materialSpec: body.material_spec || null,
      priceMin: body.price_min || null,
      priceMax: body.price_max || null,
      priceUnit: body.price_unit || 'per MT',
      currency: body.currency || 'INR',
      isNegotiable: body.is_negotiable !== false,
      quantityAvailable: body.quantity_available || null,
      unit: body.unit || 'MT',
      moq: body.moq || null,
      leadTime: body.lead_time || null,
      listingType: body.listing_type || 'product',
      listingRole: body.listing_role || 'supplier',
      applications: body.applications || [],
      keywords: body.keywords || [],
      taxonomyId: body.taxonomy_id || null,
      sellerProfileId: sellerProfile.id,
      companyId: sellerProfile.company_id,
      isDevelopmentTrustMode: isDevTrust,
      isVerified,
      seoTitle: body.seo_title || body.title,
      seoDescription: body.seo_description || (body.description?.slice(0, 160) || null),
      expiresAt: body.expires_at || null,
      specifications: Array.isArray(body.specifications) ? body.specifications : [],
      pricingTiers: Array.isArray(body.pricing_tiers) ? body.pricing_tiers : [],
    });

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: 'listing_created',
      resource: 'listings',
      resourceId: result.id,
      details: { title: body.title, metalType: body.metal_type, status: result.moderationStatus },
      request,
    });

    return NextResponse.json({ success: true, data: { id: result.id, slug: result.slug, title: result.title, moderation_status: result.moderationStatus } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message } },
      { status: 500 },
    );
  }
}
