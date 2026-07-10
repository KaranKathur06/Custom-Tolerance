import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export class CRMProjectionService {
  /**
   * Get main KPIs for the CRM Dashboard
   */
  static async getKPIs() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return { buyers: 0, sellers: 0, activeLeads: 0, mrr: 0 };
    
    // In production, these should be materialized views updated by the Outbox Worker
    // For now, doing live aggregations
    const [buyers, sellers, leads] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'BUYER'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'SELLER'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['NEW', 'CONTACTED', 'QUALIFIED']),
    ]);

    return {
      buyers: buyers.count || 0,
      sellers: sellers.count || 0,
      activeLeads: leads.count || 0,
      mrr: 0, // Should come from a dedicated payments/subscription projection
    };
  }

  /**
   * Get CRM Tasks
   */
  static async getTasks(page = 1, limit = 50, filters?: { status?: string, assigned_to?: string }) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        assigned:assigned_to(full_name),
        customer:customer_id(full_name, email),
        company:company_id(name)
      `, { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    const { data, count, error } = await query
      .order('due_date', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error fetching CRM tasks:", error);
      return { data: [], count: 0 };
    }

    return { data, count };
  }

  /**
   * Get Kanban Leads grouped by stage
   */
  static async getKanbanLeads() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return [];
    
    // Fetch leads and group them by status
    const { data: leads } = await supabase
      .from('leads')
      .select(`
        *,
        company:company_id(name),
        contact:contact_id(full_name, email)
      `);

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
          company: lead.company?.name || 'Unknown',
          contact: lead.contact?.full_name || lead.contact?.email || 'Unknown',
          value: lead.estimated_value ? `₹${(lead.estimated_value / 100000).toFixed(1)}L` : 'TBD',
          probability: lead.probability || 10,
          source: lead.source || 'Direct',
          nextAction: 'Follow up',
          dueIn: 'TBD'
        };

        const stage = stages.find(s => s.key === lead.status);
        if (stage) {
          stage.leads.push(mappedLead);
        }
      }
    }

    return stages;
  }

  /**
   * Get Pipeline Stages
   */
  static async getPipeline() {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) return [];
    
    // Fetch live data for each stage.
    // In a real system, the Outbox worker updates a `crm_pipeline_projections` table.
    // For now we'll do raw aggregations.
    const [newLeads, qualifiedLeads, rfqs, quotes, orders] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'QUALIFIED'),
      supabase.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      supabase.from('quotes').select('id', { count: 'exact', head: true }).in('status', ['DRAFT', 'SENT']),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'), // simplified
    ]);

    return [
      { id: 'lead-new', title: 'New Leads', count: newLeads.count || 0, value: 0 },
      { id: 'lead-qualified', title: 'Qualified Leads', count: qualifiedLeads.count || 0, value: 0 },
      { id: 'rfq-active', title: 'Active RFQs', count: rfqs.count || 0, value: 0 },
      { id: 'quotes-sent', title: 'Quotes Sent', count: quotes.count || 0, value: 0 },
      { id: 'orders-won', title: 'Orders Won', count: orders.count || 0, value: 0 },
    ];
  }

  /**
   * Get Customers (Buyers/Sellers combined or filtered)
   */
  static async getCustomers(role: 'BUYER' | 'SELLER' | 'ALL' = 'ALL', page = 1, limit = 50) {
    const supabase = createSupabaseServiceRoleClient();
    if (!supabase) throw new Error("Supabase client not initialized");
    
    let query = supabase
      .from('profiles')
      .select(`
        *,
        company:companies(name, industry)
      `, { count: 'exact' });

    if (role !== 'ALL') {
      query = query.eq('role', role);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error fetching customers:", error);
      return { data: [], count: 0 };
    }

    return { data, count };
  }
}
