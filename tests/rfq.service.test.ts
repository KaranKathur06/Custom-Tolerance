import test from 'node:test';
import assert from 'node:assert/strict';
import { RfqService } from '@/lib/domain/services/rfq.service';
import { InMemoryEventBus } from '@/lib/domain/events';

class StubRfqRepository {
  public createdRfqs: any[] = [];

  async create(input: any) {
    this.createdRfqs.push(input);
    return {
      id: 'rfq-1',
      title: input.title,
      slug: input.slug,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }

  async linkIndustry() {
    return null;
  }

  async linkCapability() {
    return null;
  }

  async recordEvent() {
    return null;
  }

  async listByBuyer(buyerProfileId: string | null, buyerUserId: string, page: number, limit: number) {
    return {
      data: [
        { id: 'rfq-1', title: 'Steel RFQ', status: 'open', created_at: new Date().toISOString() },
        { id: 'rfq-2', title: 'Aluminum RFQ', status: 'open', created_at: new Date().toISOString() },
      ],
      count: 2,
    };
  }

  async getById(rfqId: string) {
    return {
      id: rfqId,
      title: 'Test RFQ',
      slug: 'test-rfq',
      status: 'open',
      quotes: [],
      buyer_profiles: { profiles: { id: 'user-1' } },
    };
  }

  async listByStatus(status: string | null, page: number, limit: number) {
    return {
      data: [
        { id: 'rfq-1', title: 'Open RFQ', status: 'open', created_at: new Date().toISOString() },
      ],
      count: 1,
    };
  }

  async updateRfq(rfqId: string, updates: Record<string, any>) {
    return { id: rfqId, title: 'Updated RFQ', ...updates };
  }
}

test('RfqService.create delegates to repository', async () => {
  const repository = new StubRfqRepository();
  const eventBus = new InMemoryEventBus();
  const service = new RfqService(repository as any, eventBus);

  const result = await service.create({
    buyerProfileId: 'buyer-1',
    buyerUserId: 'user-1',
    title: 'Steel Requirement',
    slug: 'steel-requirement',
  });

  assert.equal(result.status, 'open');
  assert.equal(result.title, 'Steel Requirement');
  assert.equal(repository.createdRfqs.length, 1);
});

test('RfqService.listByBuyer returns buyer RFQs with pagination', async () => {
  const repository = new StubRfqRepository();
  const eventBus = new InMemoryEventBus();
  const service = new RfqService(repository as any, eventBus);

  const result = await service.listByBuyer('buyer-1', 'user-1', 1, 20);

  assert.equal(result.data.length, 2);
  assert.equal(result.count, 2);
  assert.equal(result.data[0].title, 'Steel RFQ');
});

test('RfqService.getById returns RFQ detail', async () => {
  const repository = new StubRfqRepository();
  const eventBus = new InMemoryEventBus();
  const service = new RfqService(repository as any, eventBus);

  const result = await service.getById('rfq-1');

  assert.equal(result.id, 'rfq-1');
  assert.equal(result.title, 'Test RFQ');
  assert.equal(result.status, 'open');
});

test('RfqService.listByStatus returns RFQs filtered by status', async () => {
  const repository = new StubRfqRepository();
  const eventBus = new InMemoryEventBus();
  const service = new RfqService(repository as any, eventBus);

  const result = await service.listByStatus('open', 1, 20);

  assert.equal(result.data.length, 1);
  assert.equal(result.count, 1);
  assert.equal(result.data[0].status, 'open');
});

test('RfqService.updateRfq delegates to repository', async () => {
  const repository = new StubRfqRepository();
  const eventBus = new InMemoryEventBus();
  const service = new RfqService(repository as any, eventBus);

  const result = await service.updateRfq('rfq-1', { status: 'closed' });

  assert.equal(result.id, 'rfq-1');
  assert.equal(result.status, 'closed');
});
