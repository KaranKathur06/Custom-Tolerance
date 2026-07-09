/**
 * Metal Hub — Inquiry Detail API
 * GET /api/inquiries/[id] → Get inquiry/RFQ details
 */

import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { RfqRepository } from '@/lib/domain/repositories/rfq.repository';
import { RfqService } from '@/lib/domain/services/rfq.service';
import { InMemoryEventBus } from '@/lib/domain/events';

type RouteParams = { params: { id: string } };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const isAdmin = ['admin', 'super_admin', 'moderator'].includes(auth.role);
  const service = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());

  let rfq: any;
  try {
    rfq = await service.getById(params.id);
  } catch (error) {
    if (error instanceof Error && error.message === 'RFQ_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Inquiry not found' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }

  // Access check: owner, quoted seller, or admin
  if (!isAdmin) {
    const buyerProfileData = rfq.buyer_profiles as any;
    const isOwner = buyerProfileData?.profiles?.id === auth.user.id;

    // Check if current user is a seller who quoted
    const { data: sellerProfile } = await auth.supabase
      .from('seller_profiles')
      .select('id')
      .eq('profile_id', auth.user.id)
      .maybeSingle();

    const isQuotedSeller = sellerProfile && (rfq.quotes as any[])?.some(
      (q: any) => q.seller_profile_id === sellerProfile.id
    );

    if (!isOwner && !isQuotedSeller) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({ success: true, data: rfq });
}
