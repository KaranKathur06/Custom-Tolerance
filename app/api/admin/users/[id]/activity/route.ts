import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { getUserGovernanceContext } from '@/lib/admin/user-governance';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.USERS_READ], requireAdmin2FA: true });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const user = await getUserGovernanceContext(auth.supabase, params.id);
  if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'The selected user no longer exists.' } }, { status: 404 });

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const { data, error } = await auth.supabase
    .from('admin_audit_logs')
    .select('id, action, resource, resource_id, details, severity, created_at')
    .eq('resource_id', params.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Could not load activity.' } }, { status: 500 });
  return NextResponse.json({ success: true, data: { user, events: data ?? [] } });
}