import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { SettingsError, SettingsService } from '@/lib/settings/service';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  if (error instanceof SettingsError) {
    const status = error.code === 'SETTINGS_PERMISSION_DENIED' ? 403
      : error.code === 'SETTINGS_NOT_FOUND' ? 404
        : error.code === 'SETTINGS_CONFLICT' ? 409
          : error.code === 'SETTINGS_VALIDATION_FAILED' ? 422 : 500;
    return NextResponse.json({ success: false, error: { code: error.code, message: error.message, details: error.details } }, { status });
  }
  return NextResponse.json({ success: false, error: { code: 'SETTINGS_READ_FAILED', message: 'Unable to load settings.' } }, { status: 500 });
}

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, { permissions: [PERMISSIONS.SETTINGS_PLATFORM_READ] });
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  try {
    const settings = await new SettingsService(auth.supabase).getAll();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return errorResponse(error);
  }
}