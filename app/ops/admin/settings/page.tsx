import { AdminProjectionService } from '@/lib/ops/projections/admin.projection';
import { SettingsClient } from './settings-client';

export default async function PlatformSettingsPage() {
  // Fetch projection settings directly via the Projection Service
  const settings = await AdminProjectionService.getPlatformSettings();

  // Normalize data for the client component
  // The table 'platform_settings' might be key-value or row-based
  // Let's assume it's row-based or an object. 
  // We will pass the data to the client to render.
  const normalizedSettings = settings && typeof settings === 'object'
    ? settings as Record<string, { value: unknown; description?: string | null; updatedAt?: string | null }>
    : {};

  return (
    <SettingsClient initialSettings={normalizedSettings} />
  );
}
