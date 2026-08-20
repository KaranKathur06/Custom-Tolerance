import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';

/** Admin OTP rows are server-only security state and must never use the user client. */
export function createAdminOtpDatabaseClient(): SupabaseClient | null {
  return createSupabaseServiceRoleClient();
}