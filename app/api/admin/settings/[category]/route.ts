import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { SettingsError, SettingsService } from '@/lib/settings/service';
import { getCategoryDefinitions } from '@/lib/settings/registry';

export const dynamic = 'force-dynamic';

type RouteParams = { params: { category: string } };

function permissionFor(category: string, action: 'read' | 'update') {
  const value = `settings.${category}.${action}`;
  return Object.values(PERMISSIONS).includes(value as (typeof PERMISSIONS)[keyof typeof PERMISSIONS])
    ? value
    : PERMISSIONS.SETTINGS_PLATFORM_READ;
}

function errorResponse(error: unknown) {
  if (error instanceof SettingsError) {
    const status = error.code === 'SETTINGS_NOT_FOUND' ? 404 : error.code === 'SETTINGS_CONFLICT' ? 409 : error.code === 'SETTINGS_VALIDATION_FAILED' ? 422 : 500;
    return NextResponse.json({ success: false, error: { code: error.code, message: error.message, details: error.details } }, { status });
  }
  return NextResponse.json({ success: false, error: { code: 'SETTINGS_UPDATE_FAILED', message: 'Unable to save settings.' } }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, { permissions: [permissionFor(params.category, 'read')] });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    return NextResponse.json({ success: true, data: await new SettingsService(auth.supabase).getCategory(params.category) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: [permissionFor(params.category, 'update')],
    requireAdmin2FA: ['security', 'features', 'advanced'].includes(params.category),
  });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  if (!getCategoryDefinitions(params.category).length) {
    return NextResponse.json({ success: false, error: { code: 'SETTINGS_NOT_FOUND', message: 'Settings category not found.' } }, { status: 404 });
  }

  let body: { key?: string; value?: unknown; expectedVersion?: number; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: 'SETTINGS_VALIDATION_FAILED', message: 'Invalid request body.' } }, { status: 422 });
  }

  if (!body.key || body.value === undefined) {
    return NextResponse.json({ success: false, error: { code: 'SETTINGS_VALIDATION_FAILED', message: 'A setting key and value are required.' } }, { status: 422 });
  }

  try {
    const updated = await new SettingsService(auth.supabase).update({
      key: body.key,
      value: body.value,
      expectedVersion: body.expectedVersion,
      reason: body.reason,
      userId: auth.user.id,
      request,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}