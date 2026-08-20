/**
 * Metal Hub — Admin User Suspend/Unsuspend API
 * POST /api/admin/users/[id]/suspend → Toggle user suspension
 */

import { NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { getUserGovernanceContext } from '@/lib/admin/user-governance';

type RouteParams = { params: { id: string } };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_BAN],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // Prevent self-suspension
  if (params.id === auth.user.id) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Cannot suspend your own account' } },
      { status: 403 },
    );
  }

  let body: { action: 'suspend' | 'unsuspend'; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  if (!['suspend', 'unsuspend'].includes(body.action)) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'action must be suspend or unsuspend' } },
      { status: 400 },
    );
  }

  const current = await getUserGovernanceContext(auth.supabase, params.id);

  if (!current) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  if (body.action === 'suspend' && current.enforcementStatus === 'suspended') {
    return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'This user is already suspended.' } }, { status: 409 });
  }
  if (body.action === 'unsuspend' && current.enforcementStatus !== 'suspended') {
    return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'This user is not suspended.' } }, { status: 409 });
  }

  const newStatus = body.action === 'suspend' ? 'suspended' : 'normal';

  const { error: updateError } = await auth.supabase
    .from('profiles')
    .update({
      enforcement_status: newStatus,
      suspended_at: body.action === 'suspend' ? new Date().toISOString() : null,
      suspended_by: body.action === 'suspend' ? auth.user.id : null,
      suspension_reason: body.action === 'suspend' ? body.reason?.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (updateError) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not update the user enforcement state.' } }, { status: 500 });
  }

  // If suspending, deactivate all their listings
  if (body.action === 'suspend') {
    await auth.supabase
      .from('listings')
      .update({ is_active: false, moderation_status: 'flagged' })
      .eq('seller_profile_id', params.id);
  }

  // Send notification
  await auth.supabase.from('notifications').insert({
    user_id: params.id,
    type: 'account_status',
    title: body.action === 'suspend' ? 'Account Suspended' : 'Account Restored',
    message: body.action === 'suspend'
      ? `Your account has been suspended. ${body.reason ? `Reason: ${body.reason}` : 'Please contact support.'}`
      : 'Your account has been restored. You can now access all features.',
    data: { action: body.action, reason: body.reason },
    is_read: false,
  });

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: `user_${body.action}ed`,
    resource: 'profiles',
    resourceId: params.id,
    details: {
      userName: current.user.fullName,
      email: current.user.email,
      reason: body.reason,
      previousStatus: current.enforcementStatus,
      newStatus,
    },
    severity: 'critical',
    request,
  });

  return NextResponse.json({
    success: true,
    data: { id: params.id, status: newStatus, action: body.action },
  });
}
