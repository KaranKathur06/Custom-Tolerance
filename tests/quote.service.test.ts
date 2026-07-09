import test from 'node:test';
import assert from 'node:assert/strict';
import { QuoteService } from '@/lib/domain/services/quote.service';
import { InMemoryEventBus } from '@/lib/domain/events';

class StubQuoteRepository {
  public createdQuotes: any[] = [];

  async create(input: any) {
    this.createdQuotes.push(input);
    return {
      id: 'quote-1',
      rfq_id: input.rfqId,
      seller_profile_id: input.sellerProfileId,
      price: input.price,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };
  }

  async update(quoteId: string, updates: any) {
    return { id: quoteId, ...updates };
  }

  async listBySellerProfile(sellerProfileId: string, page: number, limit: number) {
    return {
      data: [
        { id: 'quote-1', price: '1000', status: 'submitted', submitted_at: new Date().toISOString() },
        { id: 'quote-2', price: '1500', status: 'viewed', submitted_at: new Date().toISOString() },
      ],
      count: 2,
    };
  }

  async getWithRfqDetails(quoteId: string) {
    return {
      id: quoteId,
      status: 'submitted',
      rfq_id: 'rfq-1',
      seller_profile_id: 'seller-1',
      rfqs: { id: 'rfq-1', title: 'Test RFQ', buyer_user_id: 'buyer-1' },
    };
  }

  async checkExistingQuote(rfqId: string, sellerProfileId: string) {
    return null;
  }

  async getBuyerQuotesGroupedByRfq(buyerProfileId: string | null, buyerUserId: string) {
    return {
      rfqs: [{ id: 'rfq-1', title: 'Steel RFQ', slug: 'steel-rfq', status: 'open' }],
      quotes: [
        {
          id: 'quote-1',
          rfq_id: 'rfq-1',
          price: '1000',
          status: 'submitted',
          seller_profiles: { id: 'seller-1', company_name: 'Steel Co' },
        },
      ],
    };
  }

  async listByRfqWithSellerDetails(rfqId: string, page: number, limit: number) {
    return {
      data: [
        {
          id: 'quote-1',
          price: '1000',
          rfq_id: rfqId,
          seller_profiles: { id: 'seller-1', company_name: 'Steel Co' },
        },
      ],
      count: 1,
    };
  }
}

test('QuoteService.submitQuote creates new quote', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.submitQuote({
    rfqId: 'rfq-1',
    sellerProfileId: 'seller-1',
    companyId: 'company-1',
    price: '1000',
    currencyCode: 'INR',
    validityDays: 30,
    attachments: [],
  });

  assert.equal(result.status, 'submitted');
  assert.equal(result.price, '1000');
  assert.equal(repository.createdQuotes.length, 1);
});

test('QuoteService.listSellerQuotes returns seller quotes with pagination', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.listSellerQuotes('seller-1', 1, 20);

  assert.equal(result.data.length, 2);
  assert.equal(result.count, 2);
});

test('QuoteService.getQuoteWithRfqDetails returns quote with RFQ', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.getQuoteWithRfqDetails('quote-1');

  assert.equal(result.id, 'quote-1');
  assert.equal(result.rfq_id, 'rfq-1');
});

test('QuoteService.getBuyerQuotesGrouped groups quotes by RFQ', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.getBuyerQuotesGrouped('buyer-profile-1', 'buyer-user-1');

  assert.equal(result.grouped.length, 1);
  assert.equal(result.grouped[0].rfq.id, 'rfq-1');
  assert.equal(result.grouped[0].quotes.length, 1);
});

test('QuoteService.updateQuoteStatus updates and publishes event', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.updateQuoteStatus('quote-1', { status: 'viewed' });

  assert.equal(result.status, 'viewed');
  assert.equal(eventBus.publishedEvents.length, 1);
  assert.equal(eventBus.publishedEvents[0].type, 'QuoteStatusUpdated');
});

test('QuoteService.getQuotesForRfq returns quotes for RFQ', async () => {
  const repository = new StubQuoteRepository();
  const eventBus = new InMemoryEventBus();
  const service = new QuoteService(repository as any, eventBus);

  const result = await service.getQuotesForRfq('rfq-1', 1, 20);

  assert.equal(result.data.length, 1);
  assert.equal(result.count, 1);
});
