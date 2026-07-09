/**
 * Metal Hub — Supplier Detail API
 * GET /api/suppliers/[id] → by seller profile UUID or marketplace slug
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import {
  computeProfileCompleteness,
  loadSupplierPublicProfile,
} from '@/lib/marketplace/public-entities';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

type RouteParams = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    const supplier = await loadSupplierPublicProfile(id);
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier,
        profileStrength: computeProfileCompleteness(supplier),
      },
    });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' } }, { status: 503 });
  }

  const { data: seller, error } = await supabase
    .from('seller_profiles')
    .select(`
      id, company_name, verification_status, certifications, created_at,
      profiles:profile_id(id, full_name, avatar_url),
      companies:company_id(id, name, logo_url, website, description, city, state, country, industry_type, is_verified, employee_count)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !seller) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } },
      { status: 404 },
    );
  }

  // Get supplier's active listings via service
  const service = new ListingService(new ListingRepository(supabase));
  const listings = await service.searchListingsBySupplier(id, 20);

  return NextResponse.json({
    success: true,
    data: { ...seller, listings },
  });
}
