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
import { ROLE_LEVELS } from '@/lib/constants/roles';
import { normalizeStoredRole } from '@/lib/auth/rbac';
import { normalizeUserRole } from '@/lib/admin/governance-contracts';

export const dynamic = 'force-dynamic';

function databaseErrorDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const candidate = error as { code?: string; message?: string; details?: string; hint?: string };
    return {
      code: candidate.code || 'DATABASE_FAILURE',
      message: candidate.message || 'Could not load users',
      details: candidate.details,
      hint: candidate.hint,
    };
  }
  return { code: 'DATABASE_FAILURE', message: error instanceof Error ? error.message : 'Could not load users' };
}

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
    if (error instanceof Error && error.message === 'INVALID_ROLE_FILTER') {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported role filter.' } }, { status: 400 });
    }
    const databaseError = databaseErrorDetails(error);
    console.error('ADMIN_USERS_QUERY_FAILED', { adminUserId: auth.user.id, role, status, search, error: databaseError });
    return NextResponse.json(
      { success: false, error: { code: databaseError.code, message: 'Unable to load the user directory.', requestId: request.headers.get('x-request-id') || undefined } },
      { status: 500 },
    );
  }

  const rows = result.contexts.map((context) => ({
    id: context.user.id,
    full_name: context.user.fullName,
    email: context.user.email,
    phone: context.user.phone,
    role: normalizeUserRole(context.role) ?? context.role.toUpperCase(),
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

  const { data: existingProfile, error: profileLookupError } = await auth.supabase
    .from('profiles')
    .select('id')
    .eq('id', target.user.id)
    .maybeSingle();
  if (profileLookupError) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not resolve the canonical user profile.' } }, { status: 500 });
  }
  if (!existingProfile) {
    const { error: profileCreateError } = await auth.supabase.from('profiles').insert({
      id: target.user.id,
      email: target.user.email,
      full_name: target.user.fullName,
      phone: target.user.phone,
      role: target.role,
      profile_status: 'incomplete',
      verification_status: 'pending',
    });
    if (profileCreateError) {
      return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not create the canonical governance profile for this account.' } }, { status: 500 });
    }
  }

  const action = body.action;
  if (action === 'verification') {
    const requestedValue = body.value?.trim().toLowerCase();
    const verificationStatus = requestedValue === 'verified' || requestedValue === 'approved'
      ? 'verified'
      : requestedValue === 'rejected'
        ? 'rejected'
        : null;
    if (!verificationStatus) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Verification value must be verified or rejected.' } }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const profileUpdate = await auth.supabase
      .from('profiles')
      .update({ verification_status: verificationStatus, updated_at: timestamp })
      .eq('id', target.user.id);
    if (profileUpdate.error) {
      return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: profileUpdate.error.message } }, { status: 500 });
    }

    const { data: sellerProfileRecord, error: sellerProfileLookupError } = await auth.supabase
      .from('seller_profiles')
      .select('id, company_id')
      .eq('profile_id', target.user.id)
      .maybeSingle();
    if (sellerProfileLookupError) {
      return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not resolve the seller profile for verification.' } }, { status: 503 });
    }
    const sellerProfile = sellerProfileRecord ?? target.sellerProfile;
    if (sellerProfile?.id) {
      const sellerUpdate = await auth.supabase
        .from('seller_profiles')
        .update({
          verification_status: verificationStatus === 'verified' ? 'approved' : 'rejected',
          review_status: verificationStatus === 'verified' ? 'approved' : 'rejected',
          onboarding_status: verificationStatus === 'verified' ? 'APPROVED' : 'REJECTED',
          approved_at: verificationStatus === 'verified' ? timestamp : null,
          rejected_at: verificationStatus === 'rejected' ? timestamp : null,
          admin_verified: verificationStatus === 'verified',
          updated_at: timestamp,
        })
        .eq('id', sellerProfile.id);
      if (sellerUpdate.error) {
        return NextResponse.json({ success: false, error: { code: 'PARTIAL_UPDATE', message: 'User verification was updated, but the seller profile could not be synchronized. Retry the action.' } }, { status: 503 });
      }

      if (sellerProfile.company_id) {
        const companyUpdate = await auth.supabase
          .from('companies')
          .update({
            verification_status: verificationStatus === 'verified' ? 'approved' : 'rejected',
            is_verified: verificationStatus === 'verified',
            updated_at: timestamp,
          })
          .eq('id', sellerProfile.company_id);
        if (companyUpdate.error) {
          return NextResponse.json({ success: false, error: { code: 'PARTIAL_UPDATE', message: 'Seller verification was updated, but the company status could not be synchronized. Retry the action.' } }, { status: 503 });
        }
      }

      const supplierUpdate = await auth.supabase
        .from('suppliers')
        .update({ verification_status: verificationStatus === 'verified' ? 'approved' : 'rejected' })
        .eq('seller_profile_id', sellerProfile.id);
      if (supplierUpdate.error) {
        return NextResponse.json({ success: false, error: { code: 'PARTIAL_UPDATE', message: 'User verification was updated, but marketplace visibility could not be synchronized. Retry the action.' } }, { status: 503 });
      }
    }

    const { data: buyerProfileRecord, error: buyerProfileLookupError } = await auth.supabase
      .from('buyer_profiles')
      .select('id')
      .eq('profile_id', target.user.id)
      .maybeSingle();
    if (buyerProfileLookupError) {
      return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not resolve the buyer profile for verification.' } }, { status: 503 });
    }
    const buyerProfile = buyerProfileRecord ?? target.buyerProfile;
    if (buyerProfile?.id) {
      const buyerUpdate = await auth.supabase
        .from('buyer_profiles')
        .update({ verification_status: verificationStatus, updated_at: timestamp })
        .eq('id', buyerProfile.id);
      if (buyerUpdate.error) {
        return NextResponse.json({ success: false, error: { code: 'PARTIAL_UPDATE', message: 'Account verification was updated, but the buyer profile could not be synchronized. Retry the action.' } }, { status: 503 });
      }
    }

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: 'user.verification_changed',
      resource: 'profile',
      resourceId: target.user.id,
      details: { value: verificationStatus, sellerProfileId: sellerProfile?.id ?? null },
      request,
    });
    return NextResponse.json({ success: true, data: { id: target.user.id, action, value: verificationStatus } });
  }

  if (action === 'status' || action === 'role') {
    const column = action === 'status' ? 'enforcement_status' : 'role';
    const value = body.value?.trim();
    if (!value) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'value is required' } }, { status: 400 });
    if (action === 'status' && !['normal', 'suspended', 'banned'].includes(value)) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid enforcement status' } }, { status: 400 });
    }
    if (action === 'status' && value === target.enforcementStatus) {
      return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `This user is already ${value}.` } }, { status: 409 });
    }
    if (action === 'role') {
      const normalizedRole = normalizeStoredRole(value);
      const actorLevel = ROLE_LEVELS[normalizeStoredRole(auth.role)];
      const targetLevel = ROLE_LEVELS[normalizedRole];
      if (targetLevel === undefined) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unsupported role.' } }, { status: 400 });
      if (actorLevel === undefined || targetLevel <= actorLevel) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot assign a role equal to or higher than your own.' } }, { status: 403 });
      if (normalizedRole === normalizeStoredRole(target.role)) return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'This user already has that role.' } }, { status: 409 });
    }

    const timestamp = new Date().toISOString();
    const updates: Record<string, string | null> = { [column]: action === 'role' ? normalizeStoredRole(value) : value, updated_at: timestamp };
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
    if (!serviceClient) return NextResponse.json({ success: false, error: { code: 'SERVICE_CONFIGURATION_ERROR', message: 'Force logout requires the server-only Supabase service role key. Configure SUPABASE_SERVICE_ROLE_KEY in the deployment environment.' } }, { status: 503 });
    const { error } = await serviceClient.auth.admin.signOut(target.user.id, 'global');
    if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    await logAdminAction(auth.supabase, { userId: auth.user.id, action: 'user.force_logout', resource: 'profile', resourceId: target.user.id, request });
    return NextResponse.json({ success: true });
  }

  if (action === 'reset_password') {
    const serviceClient = createSupabaseServiceRoleClient();
    if (!target.user.email) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'This user has no email address for password recovery.' } }, { status: 400 });
    if (serviceClient) {
      const { data: link, error } = await serviceClient.auth.admin.generateLink({ type: 'recovery', email: target.user.email, options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password` } });
      if (error || !link?.properties?.action_link) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error?.message || 'Could not create reset link' } }, { status: 500 });
      await sendEmail({ to: target.user.email, subject: 'Reset your Custom Tolerance password', text: `Use this link to reset your password: ${link.properties.action_link}`, html: `<p>Use the following link to reset your password:</p><p><a href="${link.properties.action_link}">Reset password</a></p>` });
    } else {
      const { error } = await auth.supabase.auth.resetPasswordForEmail(target.user.email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password` });
      if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }
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
