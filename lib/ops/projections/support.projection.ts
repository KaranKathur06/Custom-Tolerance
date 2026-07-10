import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class SupportProjectionService {
  static async getTickets(page = 1, limit = 50, filters?: { status?: string, category?: string }) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_id(full_name, email),
        company:company_id(name),
        assigned_to:assigned_admin_id(full_name)
      `, { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error fetching support tickets:", error);
      return { data: [], count: 0 };
    }

    return { data, count };
  }

  static async getTicketStats() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return { open: 0, inProgress: 0, resolved: 0, urgent: 0 };
    
    // In a real projection service, this might be a single query to a materialized view
    // For now, doing multiple count queries
    const [open, inProgress, resolved, urgent] = await Promise.all([
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'RESOLVED'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('priority', 'URGENT').neq('status', 'CLOSED'),
    ]);

    return {
      open: open.count || 0,
      inProgress: inProgress.count || 0,
      resolved: resolved.count || 0,
      urgent: urgent.count || 0,
    };
  }
}
