import { AdminProjectionService } from '@/lib/ops/projections/admin.projection';
import { SettingsClient } from './settings-client';

export default async function PlatformSettingsPage() {
  // Fetch live settings directly via the Projection Service
  const settings = await AdminProjectionService.getPlatformSettings();

  // Normalize data for the client component
  // The table 'platform_settings' might be key-value or row-based
  // Let's assume it's row-based or an object. 
  // We will pass the data to the client to render.
  const normalizedSettings: Record<string, { value: any; description?: string | null; updatedAt?: string | null }> = {};
  
  if (settings && typeof settings === 'object') {
    // If it's a single JSON object with keys
    for (const [key, value] of Object.entries(settings)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        normalizedSettings[key] = {
          value,
          description: `Configuration for ${key}`,
          updatedAt: settings.updated_at
        };
      }
    }
  }

  return (
    <SettingsClient initialSettings={normalizedSettings} />
  );
}
