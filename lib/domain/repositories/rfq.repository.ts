import type { SupabaseClient } from '@supabase/supabase-js';

export type CreateRfqDomainInput = {
  buyerProfileId: string;
  buyerUserId: string;
  title: string;
  slug: string;
  description: string | null;
  quantity: string | null;
  unit: string;
  budgetRange: string | null;
  deliveryTimeline: string | null;
  deliveryDate: string | null;
  deliveryState: string | null;
  deliveryCity: string | null;
  city: string | null;
  state: string | null;
  country: string;
  companyId: string | null;
  materialGrade: string | null;
  manufacturingProcess: string | null;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  moqRequired: boolean;
  guestToken: string | null;
};

export type RfqRecord = {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
};

export class RfqRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: CreateRfqDomainInput): Promise<RfqRecord> {
    const payload: Record<string, unknown> = {
      buyer_profile_id: input.buyerProfileId,
      buyer_user_id: input.buyerUserId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      quantity: input.quantity,
      budget_range: input.budgetRange,
      delivery_timeline: input.deliveryTimeline,
      delivery_date: input.deliveryDate,
      delivery_state: input.deliveryState,
      delivery_city: input.deliveryCity,
      city: input.city,
      state: input.state,
      country: input.country,
      status: 'open',
      visibility_level: 'standard',
      created_by_real_user: true,
      is_seeded: false,
      company_id: input.companyId ?? null,
      material_grade: input.materialGrade ?? null,
      manufacturing_process: input.manufacturingProcess ?? null,
      frequency: input.frequency ?? 'one_time',
      moq_required: input.moqRequired ?? false,
      guest_token: input.guestToken ?? null,
    };

    const { data, error } = await this.supabase
      .from('rfqs')
      .insert(payload)
      .select('id, title, slug, status, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create RFQ');
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  async linkIndustry(rfqId: string, industryId: string): Promise<void> {
    const { data: industry } = await this.supabase
      .from('industries')
      .select('id')
      .eq('id', industryId)
      .maybeSingle();

    if (!industry?.id) {
      return;
    }

    const { error } = await this.supabase.from('rfq_industries').insert({
      rfq_id: rfqId,
      industry_id: industry.id,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async linkCapability(rfqId: string, capabilityId: string): Promise<void> {
    const { data: capability } = await this.supabase
      .from('capabilities')
      .select('id')
      .eq('id', capabilityId)
      .maybeSingle();

    if (!capability?.id) {
      return;
    }

    const { error } = await this.supabase.from('rfq_capabilities').insert({
      rfq_id: rfqId,
      capability_id: capability.id,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async recordEvent(input: { eventType: string; actorId: string; resourceId: string; metadata?: Record<string, unknown> }): Promise<void> {
    const { error } = await this.supabase.from('platform_events').insert({
      event_type: input.eventType,
      actor_id: input.actorId,
      resource_type: 'rfq',
      resource_id: input.resourceId,
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async listByBuyer(
    buyerProfileId: string | null,
    buyerUserId: string,
    page: number,
    limit: number,
  ): Promise<{ data: any[]; count: number | null }> {
    let query = this.supabase
      .from('rfqs')
      .select(
        `
        id, title, slug, description, quantity, budget_range,
        delivery_timeline, status, visibility_level, city, state, country,
        created_at, updated_at,
        quotes(count)
      `,
        { count: 'exact' },
      );

    if (buyerProfileId) {
      query = query.eq('buyer_profile_id', buyerProfileId);
    } else {
      query = query.eq('buyer_user_id', buyerUserId);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return { data: data || [], count };
  }

  async getById(rfqId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('rfqs')
      .select(
        `
        *,
        buyer_profiles:buyer_profile_id(
          id,
          profiles:profile_id(id, full_name, email, phone, avatar_url),
          companies:company_id(id, name, logo_url, city, state)
        ),
        quotes(
          id, seller_profile_id, amount, currency, status, message, created_at,
          seller_profiles:seller_profile_id(id, company_name,
            profiles:profile_id(full_name, avatar_url)
          )
        )
      `,
      )
      .eq('id', rfqId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('RFQ_NOT_FOUND');
    }

    return data;
  }

  async listByStatus(status: string | null, page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    let query = this.supabase
      .from('rfqs')
      .select(
        `
        id, title, slug, description, status, city, state, created_at, updated_at,
        buyer_company_name, visibility_level, material_grade, manufacturing_process,
        quotes(count)
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return { data: data || [], count };
  }

  async updateRfq(rfqId: string, updates: Record<string, any>): Promise<any> {
    const { data, error } = await this.supabase
      .from('rfqs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', rfqId)
      .select('id, title, slug, status')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getForQuoteSubmission(rfqId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('rfqs')
      .select('id, status, title, slug, buyer_profile_id, visibility_level')
      .eq('id', rfqId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
