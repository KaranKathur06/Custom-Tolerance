import { randomUUID } from 'crypto';
import type { EventBus } from '@/lib/domain/events';
import { RfqRepository } from '@/lib/domain/repositories/rfq.repository';

export type CreateRfqCommand = {
  buyerProfileId: string;
  buyerUserId: string;
  title: string;
  description?: string | null;
  quantity?: string | null;
  unit?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  deliveryLocation?: string | null;
  deliveryState?: string | null;
  deliveryCity?: string | null;
  deliveryDate?: string | null;
  deliveryTimeline?: string | null;
  qualitySpecs?: string | null;
  taxonomyId?: string | null;
  companyId?: string | null;
  industryId?: string | null;
  capabilityId?: string | null;
  materialGrade?: string | null;
  manufacturingProcess?: string | null;
  frequency?: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  moqRequired?: boolean;
  guestToken?: string | null;
  slug: string;
};

export class RfqService {
  constructor(
    private readonly rfqRepository: RfqRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(input: CreateRfqCommand) {
    const quantityLabel = input.quantity && input.unit ? `${input.quantity} ${input.unit}` : input.quantity ?? null;

    const locationParts = (input.deliveryLocation ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    const city = input.deliveryCity ?? locationParts[0] ?? input.deliveryLocation ?? null;
    const state = input.deliveryState ?? locationParts[1] ?? null;

    const descriptionParts = [input.description?.trim()].filter(Boolean) as string[];

    if (input.qualitySpecs?.trim()) {
      descriptionParts.push(`Technical specs: ${input.qualitySpecs.trim()}`);
    }

    if (input.unit && input.quantity) {
      descriptionParts.push(`Unit: ${input.unit}`);
    }

    const description = descriptionParts.join('\n\n') || input.title;

    const budgetRange = this.formatBudgetRange(input.budgetMin, input.budgetMax);

    const rfq = await this.rfqRepository.create({
      buyerProfileId: input.buyerProfileId,
      buyerUserId: input.buyerUserId,
      title: input.title.trim(),
      slug: input.slug,
      description,
      quantity: quantityLabel,
      unit: input.unit ?? 'MT',
      budgetRange,
      deliveryTimeline: input.deliveryTimeline ?? null,
      deliveryDate: input.deliveryDate ?? null,
      deliveryState: state,
      deliveryCity: city,
      city,
      state,
      country: 'India',
      companyId: input.companyId ?? null,
      materialGrade: input.materialGrade ?? null,
      manufacturingProcess: input.manufacturingProcess ?? null,
      frequency: input.frequency ?? 'one_time',
      moqRequired: input.moqRequired ?? false,
      guestToken: input.guestToken ?? null,
    });

    if (input.industryId) {
      await this.rfqRepository.linkIndustry(rfq.id, input.industryId);
    }

    if (input.capabilityId) {
      await this.rfqRepository.linkCapability(rfq.id, input.capabilityId);
    }

    await this.rfqRepository.recordEvent({
      eventType: 'rfq.created',
      actorId: input.buyerUserId,
      resourceId: rfq.id,
      metadata: { slug: rfq.slug, guest_token: input.guestToken ?? null },
    });

    await this.eventBus.publish({
      id: randomUUID(),
      type: 'buyer.rfq.created',
      aggregateId: rfq.id,
      aggregateType: 'rfq',
      occurredAt: new Date().toISOString(),
      actorId: input.buyerUserId,
      correlationId: randomUUID(),
      version: 1,
      payload: { rfqId: rfq.id, slug: rfq.slug },
    });

    return rfq;
  }

  private formatBudgetRange(min?: number | null, max?: number | null, currency = 'INR') {
    if (min != null && max != null) {
      return `${currency} ${min.toLocaleString('en-IN')} – ${max.toLocaleString('en-IN')}`;
    }
    if (min != null) return `${currency} ${min.toLocaleString('en-IN')}+`;
    if (max != null) return `Up to ${currency} ${max.toLocaleString('en-IN')}`;
    return null;
  }

  async listByBuyer(
    buyerProfileId: string | null,
    buyerUserId: string,
    page: number,
    limit: number,
  ): Promise<{ data: any[]; count: number | null }> {
    return this.rfqRepository.listByBuyer(buyerProfileId, buyerUserId, page, limit);
  }

  async getById(rfqId: string): Promise<any> {
    return this.rfqRepository.getById(rfqId);
  }

  async listByStatus(status: string | null, page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    return this.rfqRepository.listByStatus(status, page, limit);
  }

  async updateRfq(rfqId: string, updates: Record<string, any>): Promise<any> {
    return this.rfqRepository.updateRfq(rfqId, updates);
  }

  async getForQuoteSubmission(rfqId: string): Promise<any> {
    return this.rfqRepository.getForQuoteSubmission(rfqId);
  }
}
