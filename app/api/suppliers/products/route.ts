/**
 * Metal Hub — Supplier Products API
 * POST /api/suppliers/products → Create a product listing for current seller
 */

import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { evaluateSupplierMarketplaceGate } from '@/lib/marketplace/supplier-marketplace-gates';
import { getServerDevelopmentTrustMode } from '@/lib/marketplace/trust-mode-server';
import { getSellerV3ActivationContext } from '@/lib/marketplace/onboarding-v3-gates';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

export async function POST(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.LISTINGS_CREATE],
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

  // Get seller profile
  const sellerContext = await getSellerV3ActivationContext(auth.supabase, auth.user.id);
  const sellerProfile = sellerContext.sellerProfile;

  if (!sellerProfile) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Seller profile required' } },
      { status: 403 },
    );
  }

  const { data: company } = await auth.supabase
    .from('companies')
    .select('email_verified, phone_verified')
    .eq('id', sellerProfile.company_id)
    .maybeSingle();

  const developmentTrustMode = await getServerDevelopmentTrustMode(auth.supabase);
  const gate = evaluateSupplierMarketplaceGate({
    action: 'publish_listing',
    onboardingStatus: sellerProfile.onboarding_status,
    profileCompletionPercent: sellerProfile.profile_completion_percent ?? 0,
    emailVerified: Boolean(auth.user.email_confirmed_at) || Boolean(company?.email_verified),
    mobileVerified: Boolean(company?.phone_verified),
    requiredDocumentsUploaded: sellerContext.requiredDocumentsUploaded && sellerContext.bankVerified,
    developmentTrustMode,
  });

  if (!gate.allowed && gate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SELLER_GATE', message: gate.message },
        gate,
      },
      { status: 403 },
    );
  }

  const isVerified = gate.allowed && gate.missingRequirements.length === 0;
  const listingService = new ListingService(new ListingRepository(auth.supabase));

  try {
    const result = await listingService.createListing({
      actorId: auth.user.id,
      title: body.title || 'Untitled Product',
      description: body.description || null,
      metalType: body.metal_type || null,
      grade: body.grade || null,
      priceMin: body.price_min || null,
      priceMax: body.price_max || null,
      priceUnit: body.price_unit || 'per MT',
      currency: body.currency || 'INR',
      isNegotiable: body.is_negotiable !== false,
      quantityAvailable: body.quantity_available || null,
      unit: body.unit || 'MT',
      moq: body.moq || null,
      listingType: body.listing_type || 'product',
      listingRole: body.listing_role || 'supplier',
      taxonomyId: body.taxonomy_id || null,
      sellerProfileId: sellerProfile.id,
      companyId: sellerProfile.company_id,
      isDevelopmentTrustMode: developmentTrustMode,
      isVerified,
      specifications: Array.isArray(body.specifications) ? body.specifications : [],
      pricingTiers: Array.isArray(body.pricing_tiers) ? body.pricing_tiers : [],
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
