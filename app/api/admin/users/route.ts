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

  let query = auth.supabase
    .from('admin_user_directory')
    .select(`
      id, full_name, email, phone, role, avatar_url,
      verification_status, created_at, last_login, company_name
    `, { count: 'exact' });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('verification_status', status);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = query
    .order(sort, { ascending: order === 'asc' })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  let rows = data || [];
  let totalCount = count || 0;

  // Fallback when the admin_user_directory view does not contain rows for some
  // profiles (legacy identity import or missing auth.users entries).
  if (error || rows.length === 0) {
    const fallbackQuery = auth.supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, verification_status, created_at', {
        count: 'exact',
      });

    if (role) fallbackQuery.eq('role', role);
    if (status) fallbackQuery.eq('verification_status', status);
    if (search) {
      fallbackQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      rows = fallbackData.map((row) => ({
        ...row,
        last_login: null,
        company_name: null,
      }));
      totalCount = fallbackCount || fallbackData.length;
    } else if (error && fallbackError) {
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: fallbackError.message } },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
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

  const { data: target, error: targetError } = await auth.supabase
    .from('profiles')
    .select('id, email, full_name, role, verification_status')
    .eq('id', body.userId)
    .maybeSingle();
  if (targetError || !target) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: targetError?.message || 'User not found' } }, { status: 404 });
  }

  const action = body.action;
  if (action === 'status' || action === 'role' || action === 'verification') {
    const column = action === 'status' ? 'profile_status' : action === 'role' ? 'role' : 'verification_status';
    const value = body.value?.trim();
    if (!value) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'value is required' } }, { status: 400 });

    const { error } = await auth.supabase.from('profiles').update({ [column]: value, updated_at: new Date().toISOString() }).eq('id', target.id);
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: `user.${action}`, resource: 'profile', resourceId: target.id, details: { value }, request });
    return NextResponse.json({ success: true, data: { id: target.id, action, value } });
  }

  if (action === 'notify') {
    const message = body.message?.trim();
    if (!message) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'message is required' } }, { status: 400 });
    const { error } = await auth.supabase.from('notifications').insert({ profile_id: target.id, title: 'Message from Custom Tolerance Ops', body: message, type: 'system', metadata: { sent_by: auth.user.id } });
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.notification_sent', resource: 'profile', resourceId: target.id, details: { message }, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'force_logout') {
    const { error } = await auth.supabase.from('admin_sessions').update({ is_active: false }).eq('user_id', target.id);
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.force_logout', resource: 'profile', resourceId: target.id, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'reset_password') {
    const serviceClient = createSupabaseServiceRoleClient();
    if (!serviceClient || !target.email) return NextResponse.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Password reset service unavailable' } }, { status: 503 });
    const { data: link, error } = await serviceClient.auth.admin.generateLink({ type: 'recovery', email: target.email, options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password` } });
    if (error || !link?.properties?.action_link) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Could not create reset link' } }, { status: 500 });
    await sendEmail({ to: target.email, subject: 'Reset your Custom Tolerance password', text: `Use this link to reset your password: ${link.properties.action_link}`, html: `<p>Use the following link to reset your password:</p><p><a href="${link.properties.action_link}">Reset password</a></p>` });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.password_reset_sent', resource: 'profile', resourceId: target.id, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await auth.supabase.from('profiles').update({ deleted_at: new Date().toISOString(), profile_status: 'suspended' }).eq('id', target.id);
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.deleted', resource: 'profile', resourceId: target.id, severity: 'critical', request });
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
