/**
 * Metal Hub — Platform Settings API Route
 *
 * GET  /api/settings/platform       → Get all platform settings (admin only)
 * PUT  /api/settings/platform       → Update platform settings (super_admin only)
 */

import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { SettingsError, SettingsService } from '@/lib/settings/service';

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.SETTINGS_PLATFORM_READ],
    requireAdmin2FA: false,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from('platform_settings')
    .select('key, value, description, updated_at')
    .order('key');

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 },
    );
  }

  // Convert to object for convenience
  const settings: Record<string, any> = {};
  for (const row of data || []) {
    settings[row.key] = { value: row.value, description: row.description, updatedAt: row.updated_at };
  }

  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.SETTINGS_PLATFORM_UPDATE],
    requireAdmin2FA: false,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const service = new SettingsService(auth.supabase);
  const updated: string[] = [];
  try {
    for (const [key, value] of Object.entries(body)) {
      await service.update({ key, value, userId: auth.user.id, request, reason: 'Legacy platform settings update' });
      updated.push(key);
    }
    return NextResponse.json({ success: true, data: { updated } });
  } catch (error) {
    if (error instanceof SettingsError) {
      const status = error.code === 'SETTINGS_CONFLICT' ? 409 : error.code === 'SETTINGS_VALIDATION_FAILED' ? 422 : error.code === 'SETTINGS_NOT_FOUND' ? 404 : 500;
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message, details: error.details }, data: { updated } }, { status });
    }
    return NextResponse.json({ success: false, error: { code: 'SETTINGS_UPDATE_FAILED', message: 'Unable to save platform settings.' }, data: { updated } }, { status: 500 });
  }
}
