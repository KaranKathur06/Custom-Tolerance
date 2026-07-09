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
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.LISTINGS_MODERATE],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const service = new ListingService(new ListingRepository(auth.supabase));
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const status = searchParams.get('status') || 'pending';

  try {
    const [{ data, count }, statusCounts] = await Promise.all([
      service.listListingsByModerationStatus(status, page, limit),
      service.getModerationStatusCounts(),
    ]);

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
