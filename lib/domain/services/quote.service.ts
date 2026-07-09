import type { SupabaseClient } from "@supabase/supabase-js";
import { QuoteRepository, type CreateQuoteInput } from "@/lib/domain/repositories/quote.repository";
import type { EventBus } from "@/lib/domain/events";

export interface QuoteServiceDependencies {
  rfqRepository?: any;
}

export class QuoteService {
  constructor(
    private quoteRepository: QuoteRepository,
    private eventBus: EventBus,
  ) {}

  /**
   * Submit a new quote or update existing draft quote on an RFQ
   * Handles validation and returns created/updated quote
   */
  async submitQuote(input: CreateQuoteInput): Promise<any> {
    try {
      const existing = await this.quoteRepository.checkExistingQuote(
        input.rfqId,
        input.sellerProfileId,
      );

      let quote;
      if (existing) {
        quote = await this.quoteRepository.update(existing.id, {
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
        });
      } else {
        quote = await this.quoteRepository.create(input);
      }

      this.eventBus.publish({
        id: Math.random().toString(36).substring(7),
        type: "QuoteSubmitted",
        aggregateId: quote.id,
        aggregateType: "quote",
        occurredAt: new Date().toISOString(),
        actorId: input.sellerProfileId,
        correlationId: Math.random().toString(36).substring(7),
        version: 1,
        payload: {
          quoteId: quote.id,
          rfqId: input.rfqId,
          sellerProfileId: input.sellerProfileId,
          price: input.price,
        },
      });

      return quote;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Update quote status via lifecycle action (view, shortlist, accept, reject)
   */
  async updateQuoteStatus(quoteId: string, patch: Record<string, any>): Promise<any> {
    try {
      const quote = await this.quoteRepository.update(quoteId, patch);

      this.eventBus.publish({
        id: Math.random().toString(36).substring(7),
        type: "QuoteStatusUpdated",
        aggregateId: quoteId,
        aggregateType: "quote",
        occurredAt: new Date().toISOString(),
        actorId: "system",
        correlationId: Math.random().toString(36).substring(7),
        version: 1,
        payload: {
          quoteId,
          status: patch.status,
          patch,
        },
      });

      return quote;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get quote by ID with full RFQ details
   */
  async getQuoteWithRfqDetails(quoteId: string): Promise<any> {
    try {
      return await this.quoteRepository.getWithRfqDetails(quoteId);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * List quotes submitted by a seller
   */
  async listSellerQuotes(sellerProfileId: string, page: number, limit: number): Promise<any> {
    try {
      return await this.quoteRepository.listBySellerProfile(sellerProfileId, page, limit);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get buyer's active RFQs with quotes grouped
   */
  async getBuyerQuotesGrouped(
    buyerProfileId: string | null,
    buyerUserId: string,
  ): Promise<{ rfqs: any[]; grouped: any[] }> {
    try {
      const { rfqs, quotes } = await this.quoteRepository.getBuyerQuotesGroupedByRfq(
        buyerProfileId,
        buyerUserId,
      );

      const grouped = (rfqs || []).map((rfq) => ({
        rfq,
        quotes: (quotes || [])
          .filter((q: any) => q.rfq_id === rfq.id)
          .map((q: any) => {
            const sellerProfiles = q.seller_profiles;
            const seller = Array.isArray(sellerProfiles) ? sellerProfiles[0] : sellerProfiles;
            return {
              ...q,
              seller,
            };
          }),
      }));

      return { rfqs: rfqs || [], grouped };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get quotes for an RFQ with seller details
   */
  async getQuotesForRfq(rfqId: string, page: number, limit: number): Promise<any> {
    try {
      return await this.quoteRepository.listByRfqWithSellerDetails(rfqId, page, limit);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
