import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { category: string } };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.ADMIN_AUDIT] });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  let query = auth.supabase
    .from('admin_audit_logs')
    .select('id, user_id, action, resource, resource_id, details, ip_address, user_agent, severity, created_at, profiles:user_id(full_name, email)')
    .eq('resource', 'platform_settings')
    .order('created_at', { ascending: false })
    .limit(100);

  if (key) query = query.eq('resource_id', key);
  if (params.category) query = query.contains('details', { category: params.category });

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: { code: 'SETTINGS_READ_FAILED', message: 'Unable to load setting history.' } }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [] });
}