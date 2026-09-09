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
  if (role === 'unknown') {
    console.error('admin_user_profile_resolution_failed', {
      userId: params.id,
      resolvedRole: context.role,
      requestId: request.headers.get('x-request-id') ?? null,
    });
  }

  // ── Shared queries (role-independent) ─────────────────────────────────────
  const settingsResult = auth.supabase.from('user_settings').select('category, key, value').eq('user_id', params.id);
  const verificationHistory = auth.supabase
    .from('admin_audit_logs')
    .select('id, action, details, severity, created_at')
    .eq('resource_id', params.id)
    .in('action', ['user.verification', 'user.verification_changed', 'user_updated'])
    .order('created_at', { ascending: false })
    .limit(20);

  // ── Role-conditional buyer queries ────────────────────────────────────────
  const hasBuyer = (role === 'buyer' || role === 'both') && context.buyerProfile?.id;
  const buyerCompanyQuery = hasBuyer && context.buyerProfile!.company_id
    ? auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees').eq('id', context.buyerProfile!.company_id).maybeSingle()
    : null;
  const buyerPrefsQuery = hasBuyer
    ? auth.supabase.from('buyer_preferences').select('company_type, contact_designation, business_email, mobile_number, company_website, annual_procurement_budget, order_frequency, procurement_methods, import_experience, preferred_incoterms, preferred_payment_terms, procurement_team_size, company_description, email_verified, mobile_verified, completion_percent').eq('buyer_profile_id', context.buyerProfile!.id).maybeSingle()
    : null;
  const buyerRfqCountQuery = hasBuyer
    ? auth.supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('buyer_profile_id', context.buyerProfile!.id)
    : null;
  const buyerQuoteCountQuery = hasBuyer
    ? auth.supabase.from('quotes').select('id, rfqs!inner(buyer_profile_id)', { count: 'exact', head: true }).eq('rfqs.buyer_profile_id', context.buyerProfile!.id).is('deleted_at', null)
    : null;
  // Buyer supplementary data — industries, categories, import countries
  const buyerIndustriesQuery = hasBuyer
    ? auth.supabase.from('buyer_industries').select('industry_name').eq('buyer_profile_id', context.buyerProfile!.id)
    : null;
  const buyerCategoriesQuery = hasBuyer
    ? auth.supabase.from('buyer_category_interests').select('category_name').eq('buyer_profile_id', context.buyerProfile!.id)
    : null;
  const buyerImportCountriesQuery = hasBuyer
    ? auth.supabase.from('buyer_import_countries').select('country_name').eq('buyer_profile_id', context.buyerProfile!.id)
    : null;

  // ── Role-conditional seller queries ───────────────────────────────────────
  const hasSeller = (role === 'seller' || role === 'both') && context.sellerProfile?.id;
  const sellerCompanyQuery = hasSeller && context.sellerProfile!.company_id
    ? auth.supabase.from('companies').select('id, owner_id, name, slug, gst_number, pan_number, business_type, website, linkedin_url, company_size, years_in_business, country_id, state_id, city_id, description, company_description, year_established, employee_count, number_of_employees, legal_business_name, full_address, factory_address, annual_production_capacity, export_capability, response_rate, avg_response_hours, completion_rate, iso_certified').eq('id', context.sellerProfile!.company_id).maybeSingle()
    : null;
  const sellerExtendedQuery = hasSeller
    ? auth.supabase.from('seller_profiles').select('id, production_capacity, certifications, accepts_rfqs, response_time_hours, onboarding_status, review_status, submitted_at, approved_at, seller_types, business_nature, industries_served, capabilities, total_employees, address_line_1, address_line_2, postal_code, factory_address_line_1, factory_address_line_2, factory_postal_code, website, linkedin_url, whatsapp, video_urls, buyer_services, supplier_interests, years_in_business').eq('id', context.sellerProfile!.id).maybeSingle()
    : null;
  const sellerListingCountQuery = hasSeller
    ? auth.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_profile_id', context.sellerProfile!.id)
    : null;
  const sellerQuoteCountQuery = hasSeller
    ? auth.supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('seller_profile_id', context.sellerProfile!.id).is('deleted_at', null)
    : null;

  // ── Execute all queries in parallel ───────────────────────────────────────
  const [
    buyerCompanyResult,
    buyerPrefsResult,
    buyerRfqCountResult,
    buyerQuoteCountResult,
    buyerIndustriesResult,
    buyerCategoriesResult,
    buyerImportCountriesResult,
    sellerCompanyResult,
    sellerExtendedResult,
    sellerListingCountResult,
    sellerQuoteCountResult,
    recentLogsResult,
  ] = await Promise.all([
    buyerCompanyQuery,
    buyerPrefsQuery,
    buyerRfqCountQuery,
    buyerQuoteCountQuery,
    buyerIndustriesQuery,
    buyerCategoriesQuery,
    buyerImportCountriesQuery,
    sellerCompanyQuery,
    sellerExtendedQuery,
    sellerListingCountQuery,
    sellerQuoteCountQuery,
    auth.supabase
      .from('admin_audit_logs')
      .select('id, action, resource, details, created_at')
      .eq('resource_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // ── Assemble role-specific dossier ────────────────────────────────────────
  const buyerMetrics = hasBuyer ? {
    profileCompletion: (context.buyerProfile as Record<string, unknown>)?.profile_completion_percent ?? null,
    rfqs: buyerRfqCountResult?.count ?? null,
    quotesReceived: buyerQuoteCountResult?.count ?? null,
  } : null;

  const sellerMetrics = hasSeller ? {
    profileCompletion: (context.sellerProfile as Record<string, unknown>)?.profile_completion_percent ?? null,
    listings: sellerListingCountResult?.count ?? null,
    quotesSubmitted: sellerQuoteCountResult?.count ?? null,
  } : null;

  // For buyer or both, primary profile is buyer
  // For seller, primary profile is seller
  const activeProfile = role === 'seller' ? context.sellerProfile : (hasBuyer ? context.buyerProfile : null);
  const activeCompany = role === 'seller' ? sellerCompanyResult?.data ?? null : buyerCompanyResult?.data ?? null;

  const metrics = role === 'buyer' && buyerMetrics
    ? buyerMetrics
    : role === 'seller' && sellerMetrics
      ? sellerMetrics
      : role === 'both'
        ? { ...(buyerMetrics ?? {}), ...(sellerMetrics ?? {}) }
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
        preferences: buyerPrefsResult?.data ?? null,
        sellerExtended: sellerExtendedResult?.data ?? null,
        buyerIndustries: (buyerIndustriesResult?.data ?? []).map((r: { industry_name: string }) => r.industry_name),
        buyerCategories: (buyerCategoriesResult?.data ?? []).map((r: { category_name: string }) => r.category_name),
        buyerImportCountries: (buyerImportCountriesResult?.data ?? []).map((r: { country_name: string }) => r.country_name),
        secondaryProfile: role === 'both' ? context.sellerProfile : null,
        secondaryCompany: role === 'both' ? sellerCompanyResult?.data ?? null : null,
        secondarySellerExtended: role === 'both' ? sellerExtendedResult?.data ?? null : null,
        metrics: {
          ...metrics,
          profileCompletion: (activeProfile as Record<string, unknown> | null)?.profile_completion_percent ?? null,
        },
      },
      settings: (await settingsResult).data || [],
      verificationHistory: (await verificationHistory).data || [],
      recentActivity: recentLogsResult.data || [],
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
