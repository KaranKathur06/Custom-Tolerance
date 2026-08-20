/**
 * Metal Hub — Admin Users Management API Route
 *
 * GET /api/admin/users    → List all users (filtered, paginated)
 *
 * Requires admin role + 2FA.
 */

import { NextResponse } from 'next/server';
import { logAdminAction, protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';
import { sendEmail } from '@/lib/services/email';
import { displayRole, getUserGovernanceContext, listUserGovernanceContexts } from '@/lib/admin/user-governance';

export const dynamic = 'force-dynamic';

type UserAction = 'status' | 'role' | 'verification' | 'notify' | 'reset_password' | 'force_logout' | 'delete';

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_LIST],
    requireAdmin2FA: false,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  let result;
  try {
    result = await listUserGovernanceContexts(auth.supabase, { page, limit, role, status: status === 'Active' ? 'normal' : status?.toLowerCase(), search });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Could not load users' } },
      { status: 500 },
    );
  }

  const rows = result.contexts.map((context) => ({
    id: context.user.id,
    full_name: context.user.fullName,
    email: context.user.email,
    phone: context.user.phone,
    role: displayRole(context.role),
    avatar_url: context.user.avatarUrl,
    account_status: context.accountStatus,
    enforcement_status: context.enforcementStatus,
    profile_status: context.profileStatus,
    verification_status: context.verificationStatus,
    created_at: context.user.createdAt,
    last_login: context.user.lastLoginAt,
    company_name: (context.sellerProfile?.company_name ?? null) as string | null,
  }));

  return NextResponse.json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_UPDATE],
    requireAdmin2FA: false,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: { userId?: string; action?: UserAction; value?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } }, { status: 400 });
  }

  if (!body.userId || !body.action) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'userId and action are required' } }, { status: 400 });
  }
  if (body.userId === auth.user.id && ['status', 'role', 'delete'].includes(body.action)) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'You cannot change your own access from this screen' } }, { status: 400 });
  }

  const target = await getUserGovernanceContext(auth.supabase, body.userId);
  if (!target) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'The selected user no longer exists.' } }, { status: 404 });
  }

  const action = body.action;
  if (action === 'status' || action === 'role' || action === 'verification') {
    const column = action === 'status' ? 'enforcement_status' : action === 'role' ? 'role' : 'verification_status';
    const value = body.value?.trim();
    if (!value) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'value is required' } }, { status: 400 });
    if (action === 'status' && !['normal', 'suspended', 'banned'].includes(value)) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid enforcement status' } }, { status: 400 });
    }
    if (action === 'status' && value === target.enforcementStatus) {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `This user is already ${value}.` } }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    const updates: Record<string, string | null> = { [column]: value, updated_at: timestamp };
    if (action === 'status' && value === 'suspended') {
      updates.suspended_at = timestamp;
      updates.suspended_by = auth.user.id;
      updates.suspension_reason = body.message?.trim() || null;
    }
    if (action === 'status' && value === 'banned') {
      updates.banned_at = timestamp;
      updates.banned_by = auth.user.id;
      updates.ban_reason = body.message?.trim() || null;
    }
    const { error } = await auth.supabase.from('profiles').update(updates).eq('id', target.user.id);
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: `user.${action}`, resource: 'profile', resourceId: target.user.id, details: { value }, request });
    return NextResponse.json({ success: true, data: { id: target.user.id, action, value } });
  }

  if (action === 'notify') {
    const message = body.message?.trim();
    if (!message) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'message is required' } }, { status: 400 });
    const { error } = await auth.supabase.from('notifications').insert({ profile_id: target.user.id, title: 'Message from Custom Tolerance Ops', body: message, type: 'system', metadata: { sent_by: auth.user.id } });
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.notification_sent', resource: 'profile', resourceId: target.user.id, details: { message }, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'force_logout') {
    const serviceClient = createSupabaseServiceRoleClient();
    if (!serviceClient) return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Session revocation service unavailable' } }, { status: 503 });
    const { error } = await serviceClient.auth.admin.signOut(target.user.id, 'global');
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.force_logout', resource: 'profile', resourceId: target.user.id, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'reset_password') {
    const serviceClient = createSupabaseServiceRoleClient();
    if (!serviceClient || !target.user.email) return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Password reset service unavailable' } }, { status: 503 });
    const { data: link, error } = await serviceClient.auth.admin.generateLink({ type: 'recovery', email: target.user.email, options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password` } });
    if (error || !link?.properties?.action_link) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Could not create reset link' } }, { status: 500 });
    await sendEmail({ to: target.user.email, subject: 'Reset your Custom Tolerance password', text: `Use this link to reset your password: ${link.properties.action_link}`, html: `<p>Use the following link to reset your password:</p><p><a href="${link.properties.action_link}">Reset password</a></p>` });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.password_reset_sent', resource: 'profile', resourceId: target.user.id, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await auth.supabase.from('profiles').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', target.user.id);
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.deleted', resource: 'profile', resourceId: target.user.id, severity: 'critical', request });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported user action' } }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.USERS_UPDATE], requireAdmin2FA: false });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => null) as { email?: string; name?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email is required' } }, { status: 400 });
  const serviceClient = createSupabaseServiceRoleClient();
  if (!serviceClient) return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Invitation service unavailable' } }, { status: 503 });
  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, { data: { full_name: body?.name?.trim() || '' } });
  if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.invited', resource: 'profile', details: { email }, request });
  return NextResponse.json({ success: true });
}
