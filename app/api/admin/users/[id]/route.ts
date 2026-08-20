/**
 * Metal Hub — Admin User Detail & Role Management API
 *
 * GET  /api/admin/users/[id]          → Get user details (admin)
 * PUT  /api/admin/users/[id]          → Update user profile/role (admin)
 * POST /api/admin/users/[id]/suspend  → Suspend/unsuspend user
 */

import { NextResponse } from 'next/server';
import { protectApiRoute, logAdminAction } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { ROLE_LEVELS } from '@/lib/constants/roles';
import { displayRole, getUserGovernanceContext } from '@/lib/admin/user-governance';
import { dossierRole } from '@/lib/admin/user-dossier';

type RouteParams = { params: { id: string } };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_READ],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const context = await getUserGovernanceContext(auth.supabase, params.id);
  if (!context) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  const role = dossierRole(context.role);
  const settingsResult = auth.supabase.from('user_settings').select('category, key, value').eq('user_id', params.id);
  const verificationHistory = auth.supabase
    .from('admin_audit_logs')
    .select('id, action, details, severity, created_at')
    .eq('resource_id', params.id)
    .in('action', ['user.verification', 'user.verification_changed', 'user_updated'])
    .order('created_at', { ascending: false })
    .limit(20);

  const roleData = role === 'both' && context.buyerProfile?.id && context.sellerProfile?.id
    ? await Promise.all([
      auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees').eq('id', context.buyerProfile.company_id).maybeSingle(),
      auth.supabase.from('buyer_preferences').select('company_type, contact_designation, business_email, mobile_number, company_website, annual_procurement_budget, order_frequency, procurement_methods, import_experience, preferred_incoterms, preferred_payment_terms, procurement_team_size, company_description, email_verified, mobile_verified, completion_percent').eq('buyer_profile_id', context.buyerProfile.id).maybeSingle(),
      auth.supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('buyer_profile_id', context.buyerProfile.id),
      auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, years_in_business, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees, legal_business_name, full_address, factory_address, annual_production_capacity, export_capability, response_rate, avg_response_hours, completion_rate, iso_certified').eq('id', context.sellerProfile.company_id).maybeSingle(),
      auth.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_profile_id', context.sellerProfile.id),
    ])
    : role === 'buyer' && context.buyerProfile?.id
    ? await Promise.all([
      auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees').eq('id', context.buyerProfile.company_id).maybeSingle(),
      auth.supabase.from('buyer_preferences').select('company_type, contact_designation, business_email, mobile_number, company_website, annual_procurement_budget, order_frequency, procurement_methods, import_experience, preferred_incoterms, preferred_payment_terms, procurement_team_size, company_description, email_verified, mobile_verified, completion_percent').eq('buyer_profile_id', context.buyerProfile.id).maybeSingle(),
      auth.supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('buyer_profile_id', context.buyerProfile.id),
    ])
    : role === 'seller' && context.sellerProfile?.id
      ? await Promise.all([
        auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, years_in_business, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees, legal_business_name, full_address, factory_address, annual_production_capacity, export_capability, response_rate, avg_response_hours, completion_rate, iso_certified').eq('id', context.sellerProfile.company_id).maybeSingle(),
        auth.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_profile_id', context.sellerProfile.id),
      ])
      : null;

  // Get recent audit logs for this user
  const { data: recentLogs } = await auth.supabase
    .from('admin_audit_logs')
    .select('id, action, resource, details, created_at')
    .eq('resource_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const activeProfile = role === 'seller' ? context.sellerProfile : role === 'buyer' || role === 'both' ? context.buyerProfile : null;
  const activeCompany = roleData?.[0]?.data ?? null;
  const preferences = role === 'buyer' || role === 'both' ? roleData?.[1]?.data ?? null : null;
  const secondaryProfile = role === 'both' ? context.sellerProfile : null;
  const secondaryCompany = role === 'both' ? roleData?.[3]?.data ?? null : null;
  const metricCount = role === 'buyer' ? roleData?.[2]?.count : role === 'seller' ? roleData?.[1]?.count : null;
  const metrics = role === 'buyer'
    ? { rfqs: metricCount ?? null, quotesReceived: null, orders: null }
    : role === 'seller'
      ? { listings: metricCount ?? null, rfqsReceived: null, orders: null }
      : role === 'both'
        ? { rfqs: roleData?.[2]?.count ?? null, listings: roleData?.[4]?.count ?? null, quotesReceived: null, orders: null }
      : {};

  return NextResponse.json({
    success: true,
    data: {
      user: context.user,
      role: displayRole(context.role),
      roleCode: role,
      accountStatus: context.accountStatus,
      enforcementStatus: context.enforcementStatus,
      profileStatus: context.profileStatus,
      verificationStatus: context.verificationStatus,
      dossier: {
        role,
        profileType: role,
        profile: activeProfile,
        company: activeCompany,
        preferences,
        secondaryProfile,
        secondaryCompany,
        metrics: {
          ...metrics,
          profileCompletion: activeProfile?.profile_completion_percent ?? null,
        },
      },
      settings: (await settingsResult).data || [],
      verificationHistory: (await verificationHistory).data || [],
      recentActivity: recentLogs || [],
    },
  });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_UPDATE],
    requireAdmin2FA: true,
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

  // Get current user
  const { data: current } = await auth.supabase
    .from('profiles')
    .select('id, role, trust_level')
    .eq('id', params.id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  // Escalation prevention: can't assign role higher than your own
  if (body.role) {
    const myLevel = ROLE_LEVELS[auth.role] || 0;
    const targetLevel = ROLE_LEVELS[body.role] || 0;

    if (targetLevel >= myLevel) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot assign a role equal to or higher than your own' } },
        { status: 403 },
      );
    }
  }

  // Build allowed updates
  const allowedFields = ['full_name', 'phone', 'role', 'trust_level', 'profile_status'];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  const { data, error: updateError } = await auth.supabase
    .from('profiles')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: updateError.message } },
      { status: 500 },
    );
  }

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: 'user_updated',
    resource: 'profiles',
    resourceId: params.id,
    details: {
      changes: Object.keys(updates),
      previousRole: current.role,
      newRole: body.role || current.role,
    },
    severity: body.role ? 'warning' : 'info',
    request,
  });

  return NextResponse.json({ success: true, data });
}
