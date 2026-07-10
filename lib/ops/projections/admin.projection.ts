import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class AdminProjectionService {
  /**
   * Fetch current platform settings
   */
  static async getPlatformSettings() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    // Attempt to load settings or return defaults if table is empty
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching platform settings:", error);
    }
    
    return data || {
      marketplace_status: 'ACTIVE',
      maintenance_mode: false,
      registration_controls: { require_approval: true },
      verification_policies: { auto_approve: false },
    };
  }

  /**
   * Get basic aggregated stats for Admin Dashboard
   */
  static async getOverviewStats() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");

    const [users, products, rfqs] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('rfqs').select('id', { count: 'exact', head: true }),
    ]);

    return {
      totalUsers: users.count || 0,
      totalProducts: products.count || 0,
      totalRfqs: rfqs.count || 0,
    };
  }
}
