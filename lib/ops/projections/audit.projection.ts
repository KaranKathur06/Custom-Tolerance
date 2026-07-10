import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class AuditProjectionService {
  /**
   * Get recent audit logs with pagination
   */
  static async getLogs(page = 1, limit = 50, search = '') {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    let query = supabase
      .from('audit_logs')
      .select('*, profiles:actor_id(full_name, email)', { count: 'exact' });

    if (search) {
      query = query.or(`action.ilike.%${search}%,resource.ilike.%${search}%,detail.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error fetching audit logs:", error);
      return { data: [], count: 0 };
    }

    return { data, count };
  }
}
