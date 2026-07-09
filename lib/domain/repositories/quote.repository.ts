import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateQuoteInput {
  rfqId: string;
  sellerProfileId: string;
  companyId: string | null;
  price: string;
  currencyCode: string;
  leadTime?: string | null;
  moq?: string | null;
  message?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  validityDays: number;
  attachments: any[];
}

export interface QuoteRecord {
  id: string;
  rfq_id: string;
  seller_profile_id: string;
  price: string;
  currency_code: string;
  lead_time: string | null;
  moq: string | null;
  message: string | null;
  payment_terms: string | null;
  notes: string | null;
  validity_days: number;
  attachments: any[];
  status: string;
  submitted_at: string;
  viewed_at: string | null;
  shortlisted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class QuoteRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(input: CreateQuoteInput): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .insert({
        rfq_id: input.rfqId,
        seller_profile_id: input.sellerProfileId,
        company_id: input.companyId,
        price: input.price,
        currency_code: input.currencyCode,
        lead_time: input.leadTime,
        moq: input.moq,
        message: input.message,
        payment_terms: input.paymentTerms,
        notes: input.notes,
        validity_days: input.validityDays,
        attachments: input.attachments,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(quoteId: string, updates: Record<string, any>): Promise<QuoteRecord> {
    const { data, error } = await this.supabase
      .from("quotes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", quoteId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getById(quoteId: string): Promise<QuoteRecord | null> {
    const { data, error } = await this.supabase
      .from("quotes")
      .select(
        `
        id, rfq_id, seller_profile_id, price, currency_code, lead_time, moq, message,
        payment_terms, notes, validity_days, attachments, status, submitted_at,
        viewed_at, shortlisted_at, created_at, updated_at, deleted_at
      `,
      )
      .eq("id", quoteId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async listBySellerProfile(
    sellerProfileId: string,
    page: number,
    limit: number,
  ): Promise<{ data: QuoteRecord[]; count: number }> {
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      this.supabase
        .from("quotes")
        .select(
          `
          id, rfq_id, seller_profile_id, price, currency_code, lead_time, moq, message,
          payment_terms, notes, validity_days, attachments, status, submitted_at,
          viewed_at, shortlisted_at, created_at, updated_at, deleted_at
        `,
        )
        .eq("seller_profile_id", sellerProfileId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      this.supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("seller_profile_id", sellerProfileId)
        .is("deleted_at", null),
    ]);

    if (dataRes.error) throw new Error(dataRes.error.message);
    if (countRes.error) throw new Error(countRes.error.message);

    return {
      data: dataRes.data || [],
      count: countRes.count || 0,
    };
  }

  async listByRfqWithSellerDetails(
    rfqId: string,
    page: number,
    limit: number,
  ): Promise<{ data: any[]; count: number }> {
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      this.supabase
        .from("quotes")
        .select(
          `
          id, price, moq, lead_time, payment_terms, status, submitted_at, viewed_at, shortlisted_at,
          rfq_id,
          seller_profiles:seller_profile_id(
            id, company_name, verification_status, trust_level,
            profiles:profile_id(full_name)
          )
        `,
        )
        .eq("rfq_id", rfqId)
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false })
        .range(offset, offset + limit - 1),
      this.supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("rfq_id", rfqId)
        .is("deleted_at", null),
    ]);

    if (dataRes.error) throw new Error(dataRes.error.message);
    if (countRes.error) throw new Error(countRes.error.message);

    return {
      data: dataRes.data || [],
      count: countRes.count || 0,
    };
  }

  async getBuyerQuotesGroupedByRfq(buyerProfileId: string | null, buyerUserId: string): Promise<{
    rfqs: any[];
    quotes: any[];
  }> {
    let rfqQuery = this.supabase.from("rfqs").select("id, title, slug, status");

    if (buyerProfileId) {
      rfqQuery = rfqQuery.eq("buyer_profile_id", buyerProfileId);
    } else {
      rfqQuery = rfqQuery.eq("buyer_user_id", buyerUserId);
    }

    const { data: rfqs, error: rfqError } = await rfqQuery
      .in("status", ["open", "in_review", "quoted"])
      .order("created_at", { ascending: false });

    if (rfqError) throw new Error(rfqError.message);

    const rfqIds = (rfqs ?? []).map((r) => r.id);
    if (!rfqIds.length) {
      return { rfqs: [], quotes: [] };
    }

    const { data: quotes, error: quotesError } = await this.supabase
      .from("quotes")
      .select(
        `
        id, price, moq, lead_time, payment_terms, status, submitted_at, viewed_at, shortlisted_at,
        rfq_id,
        seller_profiles:seller_profile_id(
          id, company_name, verification_status, trust_level,
          profiles:profile_id(full_name)
        )
      `,
      )
      .in("rfq_id", rfqIds)
      .is("deleted_at", null)
      .order("submitted_at", { ascending: false });

    if (quotesError) throw new Error(quotesError.message);

    return {
      rfqs: rfqs || [],
      quotes: quotes || [],
    };
  }

  async getWithRfqDetails(quoteId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from("quotes")
      .select(
        `
        id, status, rfq_id, seller_profile_id,
        rfqs:rfq_id(id, title, slug, buyer_profile_id, buyer_user_id)
      `,
      )
      .eq("id", quoteId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async checkExistingQuote(rfqId: string, sellerProfileId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from("quotes")
      .select("id, status")
      .eq("rfq_id", rfqId)
      .eq("seller_profile_id", sellerProfileId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
}
