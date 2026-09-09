import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class CRMProjectionService {
  /**
   * Get main KPIs for the CRM Dashboard
   */
  static async getKPIs() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return { buyers: 0, sellers: 0, activeLeads: 0, mrr: 0 };

    try {
      // In production, these should be materialized views updated by the Outbox Worker
      // For now, doing live aggregations
      const [buyers, sellers, leads] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['buyer', 'BUYER', 'both', 'BOTH']).is('deleted_at', null),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['seller', 'SELLER', 'manufacturer', 'MANUFACTURER', 'distributor', 'DISTRIBUTOR', 'both', 'BOTH']).is('deleted_at', null),
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('stage', ['NEW', 'CONTACTED', 'QUALIFIED']),
      ]);

      return {
        buyers: buyers.count || 0,
        sellers: sellers.count || 0,
        activeLeads: leads.count || 0,
        mrr: 0,
      };
    } catch {
      return { buyers: 0, sellers: 0, activeLeads: 0, mrr: 0 };
    }
  }

  /**
   * Get CRM Tasks
   */
  static async getTasks(page = 1, limit = 50, filters?: { status?: string, assigned_to?: string }) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) {
      return { data: [], count: 0 };
    }

    try {
      let query = supabase
        .from('lead_activities')
        .select('id, lead_id, user_id, type, content, created_at', { count: 'exact' });

      if (filters?.status) {
        query = query.eq('type', filters.status);
      }
      if (filters?.assigned_to) {
        query = query.eq('user_id', filters.assigned_to);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error("Error fetching CRM tasks:", error);
        return { data: [], count: 0 };
      }

      const userIds = [...new Set((data ?? []).map((activity) => activity.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return {
        data: (data ?? []).map((activity) => ({
          ...activity,
          title: activity.content || activity.type || 'CRM activity',
          status: 'OPEN',
          priority: 'LOW',
          due_date: null,
          assigned: profileById.get(activity.user_id) ?? null,
        })),
        count,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }

  /**
   * Get Kanban Leads grouped by stage
   */
  static async getKanbanLeads() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return [];

    try {
      // Fetch leads and group them by status
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*');

      if (error) {
        console.error("[CRM Projection] Failed to fetch Kanban leads:", error);
      }

      const stages = [
      { key: 'NEW', label: 'New', color: 'var(--ops-info)', leads: [] as any[] },
      { key: 'CONTACTED', label: 'Contacted', color: '#8b5cf6', leads: [] as any[] },
      { key: 'QUALIFIED', label: 'Qualified', color: 'var(--ops-warning)', leads: [] as any[] },
      { key: 'NEGOTIATION', label: 'Negotiation', color: '#f97316', leads: [] as any[] },
      { key: 'CONVERTED', label: 'Converted', color: 'var(--ops-success)', leads: [] as any[] },
    ];

      if (leads) {
        for (const lead of leads) {
          const mappedLead = {
            id: lead.id,
            company: lead.company_name || 'Unknown',
            contact: lead.contact_name || lead.contact_email || 'Unknown',
            value: lead.deal_value ? `₹${(lead.deal_value / 100000).toFixed(1)}L` : 'TBD',
            probability: lead.probability || 10,
            source: lead.source || 'Direct',
            nextAction: 'Follow up',
            dueIn: 'TBD'
          };

          const stage = stages.find(s => s.key === lead.stage);
          if (stage) {
            stage.leads.push(mappedLead);
          }
        }
      }

      return stages;
    } catch {
      return [];
    }
  }

  /**
   * Get Pipeline Stages
   */
  static async getPipeline() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return [];

    try {
      // Fetch live data for each stage.
      // In a real system, the Outbox worker updates a `crm_pipeline_projections` table.
      // For now we'll do raw aggregations.
      const [newLeads, qualifiedLeads, rfqs, quotes, orders] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'NEW'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('stage', 'QUALIFIED'),
        supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).in('status', ['DRAFT', 'SENT']),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      ]);

      return [
        { id: 'lead-new', title: 'New Leads', count: newLeads.count || 0, value: 0 },
        { id: 'lead-qualified', title: 'Qualified Leads', count: qualifiedLeads.count || 0, value: 0 },
        { id: 'rfq-active', title: 'Active RFQs', count: rfqs.count || 0, value: 0 },
        { id: 'quotes-sent', title: 'Quotes Sent', count: quotes.count || 0, value: 0 },
        { id: 'orders-won', title: 'Orders Won', count: orders.count || 0, value: 0 },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Get Customers (Buyers/Sellers combined or filtered)
   */
  static async getCustomers(role: 'BUYER' | 'SELLER' | 'ALL' = 'ALL', page = 1, limit = 50) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) {
      return { data: [], count: 0 };
    }

    try {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at', { count: 'exact' });

      if (role !== 'ALL') {
        query = query.in('role', role === 'BUYER' ? ['buyer', 'BUYER', 'both', 'BOTH'] : ['seller', 'SELLER', 'manufacturer', 'MANUFACTURER', 'distributor', 'DISTRIBUTOR', 'both', 'BOTH']);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error("Error fetching customers:", error);
        return { data: [], count: 0 };
      }

      return {
        data: (data ?? []).map((profile) => ({
          ...profile,
          company: null,
        })),
        count,
      };
    } catch {
      return { data: [], count: 0 };
    }
  }
}
