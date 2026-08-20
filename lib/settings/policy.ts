import type { SupabaseClient } from '@supabase/supabase-js';
import { SettingsService } from './service';

export async function readBooleanSetting(
  supabase: SupabaseClient,
  key: string,
  defaultValue: boolean,
) {
  try {
    return await new SettingsService(supabase).get<boolean>(key);
  } catch {
    return defaultValue;
  }
}

export async function readEnumSetting<T extends string>(
  supabase: SupabaseClient,
  key: string,
  defaultValue: T,
) {
  try {
    return await new SettingsService(supabase).get<T>(key);
  } catch {
    return defaultValue;
  }
}

export function isVerifiedBuyer(input: {
  emailVerified: boolean;
  mobileVerified: boolean;
  profileCompletionPercent?: number | null;
}) {
  return input.emailVerified && input.mobileVerified && (input.profileCompletionPercent ?? 0) >= 40;
}

export function marketplaceStatusAllowsPublicRead(status: string) {
  return status === 'open' || status === 'limited';
}