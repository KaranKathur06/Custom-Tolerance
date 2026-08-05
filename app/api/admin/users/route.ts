/**
 * Metal Hub — Admin Users Management API Route
 *
 * GET /api/admin/users    → List all users (filtered, paginated)
 *
 * Requires admin role + 2FA.
 */

import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.USERS_LIST],
    requireAdmin2FA: true,
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
  if (rows.length === 0) {
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
