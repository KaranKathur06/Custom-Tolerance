/**
 * Metal Hub — Product Moderation API Route
 *
 * POST /api/products/[slug]/moderate    → Approve or reject a listing
 *
 * Requires listings.moderate permission.
 */

import { NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

type RouteParams = { params: { slug: string } };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.LISTINGS_MODERATE],
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: { action: 'approve' | 'reject' | 'flag'; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  if (!['approve', 'reject', 'flag'].includes(body.action)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Action must be approve, reject, or flag' } },
      { status: 400 },
    );
  }

  const listingService = new ListingService(new ListingRepository(auth.supabase));

  try {
    const result = await listingService.moderateListing({
      action: body.action,
      notes: body.notes,
      actorId: auth.user.id,
      slug: params.slug,
      correlationId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    });

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: `listing_${body.action}d`,
      resource: 'listings',
      resourceId: result.id,
      details: {
        title: result.title,
        previousStatus: result.previousStatus,
        newStatus: result.moderationStatus,
        notes: body.notes,
      },
      severity: body.action === 'reject' ? 'warning' : 'info',
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        title: result.title,
        moderation_status: result.moderationStatus,
        is_active: result.isActive,
        moderationAction: body.action,
        notificationSent: result.notificationSent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'LISTING_NOT_FOUND' ? 404 : 500;

    return NextResponse.json(
      { success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR', message } },
      { status },
    );
  }
}
