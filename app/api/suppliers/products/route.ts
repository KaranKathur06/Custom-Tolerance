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

  // Generate slug
  const slug = (body.title || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    + '-' + Math.random().toString(36).slice(2, 6);

  const isVerified = gate.allowed && gate.missingRequirements.length === 0;
  const initialStatus = isVerified ? 'approved' : 'pending';

  const { data, error } = await auth.supabase
    .from('listings')
    .insert({
      title: body.title || 'Untitled Product',
      slug,
      description: body.description || null,
      metal_type: body.metal_type || null,
      grade: body.grade || null,
      price_min: body.price_min || null,
      price_max: body.price_max || null,
      price_unit: body.price_unit || 'per MT',
      currency: body.currency || 'INR',
      is_negotiable: body.is_negotiable !== false,
      quantity_available: body.quantity_available || null,
      unit: body.unit || 'MT',
      moq: body.moq || null,
      listing_type: body.listing_type || 'product',
      listing_role: body.listing_role || 'supplier',
      taxonomy_id: body.taxonomy_id || null,
      seller_profile_id: sellerProfile.id,
      company_id: sellerProfile.company_id,
      is_active: true,
      moderation_status: initialStatus,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
