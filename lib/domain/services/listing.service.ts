import { DomainEvent } from '@/lib/domain/events';
import {
  ListingRepository,
  type CreateListingInput,
  type ListingModerationAction,
  type ListingPricingTierInput,
  type ListingSpecificationInput,
  type ListingDetail,
} from '@/lib/domain/repositories/listing.repository';

export type ListingModerationInput = {
  action: ListingModerationAction;
  notes?: string;
  actorId: string;
  slug: string;
  correlationId?: string;
};

export type CreateListingInputCommand = {
  actorId: string;
  title: string;
  description?: string | null;
  metalType?: string | null;
  grade?: string | null;
  materialSpec?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  priceUnit?: string;
  currency?: string;
  isNegotiable?: boolean;
  quantityAvailable?: number | null;
  unit?: string;
  moq?: number | null;
  leadTime?: string | null;
  listingType?: string;
  listingRole?: string;
  applications?: unknown[];
  keywords?: unknown[];
  taxonomyId?: string | null;
  sellerProfileId: string;
  companyId?: string | null;
  isDevelopmentTrustMode?: boolean;
  isVerified?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  expiresAt?: string | null;
  specifications?: ListingSpecificationInput[];
  pricingTiers?: ListingPricingTierInput[];
  slug?: string;
  correlationId?: string;
};

export class ListingService {
  constructor(private readonly repository: ListingRepository) {}

  async getProductDetail(slug: string, requestIp: string): Promise<{ product: ListingDetail; incrementedView: boolean }> {
    const product = await this.repository.getDetailBySlug(slug);

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const viewKey = `view:${product.id}:${requestIp}`;
    const hasRecentView = await this.repository.hasRecentView(viewKey);
    let incrementedView = false;

    if (!hasRecentView) {
      await this.repository.incrementListingViews(product.id, product.views_count);
      const windowEnd = new Date(Date.now() + 3600000).toISOString();
      await this.repository.recordViewLimit(viewKey, windowEnd);
      incrementedView = true;
    }

    if (product.listing_media) {
      product.listing_media.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    if (product.listing_specifications) {
      product.listing_specifications.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    if (product.listing_pricing_tiers) {
      product.listing_pricing_tiers.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return { product, incrementedView };
  }

  async updateProduct(input: {
    slug: string;
    actorId: string;
    isAdmin: boolean;
    updates: Record<string, any>;
    specifications?: ListingSpecificationInput[];
    pricingTiers?: ListingPricingTierInput[];
  }): Promise<any> {
    const listing = await this.repository.getListingWithOwnerBySlug(input.slug);

    if (!listing) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const ownerProfileId = Array.isArray(listing.seller_profiles)
      ? (listing.seller_profiles[0] as { profile_id?: string })?.profile_id
      : (listing.seller_profiles as { profile_id?: string } | null | undefined)?.profile_id;
    const isOwner = ownerProfileId === input.actorId;
    if (!isOwner && !input.isAdmin) {
      throw new Error('FORBIDDEN');
    }

    const allowedFields = [
      'title', 'description', 'metal_type', 'grade', 'material_spec',
      'price_min', 'price_max', 'price_unit', 'currency', 'is_negotiable',
      'quantity_available', 'unit', 'moq', 'lead_time',
      'listing_type', 'listing_role', 'applications', 'keywords',
      'taxonomy_id', 'seo_title', 'seo_description', 'expires_at',
    ];

    const adminFields = ['is_active', 'moderation_status', 'is_featured', 'featured_until'];

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in input.updates) {
        updates[field] = input.updates[field];
      }
    }
    if (input.isAdmin) {
      for (const field of adminFields) {
        if (field in input.updates) {
          updates[field] = input.updates[field];
        }
      }
    }

    const updated = await this.repository.updateListing(listing.id, updates);

    if (input.specifications) {
      await this.repository.deleteSpecifications(listing.id);
      await this.repository.insertSpecifications(listing.id, input.specifications);
    }

    if (input.pricingTiers) {
      await this.repository.deletePricingTiers(listing.id);
      await this.repository.insertPricingTiers(listing.id, input.pricingTiers);
    }

    return updated;
  }

  async deleteProduct(input: { slug: string; actorId: string; isAdmin: boolean }): Promise<void> {
    const listing = await this.repository.getListingWithOwnerBySlug(input.slug);

    if (!listing) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const ownerProfileId = Array.isArray(listing.seller_profiles)
      ? (listing.seller_profiles[0] as { profile_id?: string })?.profile_id
      : (listing.seller_profiles as { profile_id?: string } | null | undefined)?.profile_id;
    const isOwner = ownerProfileId === input.actorId;
    if (!isOwner && !input.isAdmin) {
      throw new Error('FORBIDDEN');
    }

    await this.repository.softDeleteListing(listing.id);
  }

  async createListing(input: CreateListingInputCommand): Promise<{
    id: string;
    title: string;
    slug: string;
    moderationStatus: 'approved' | 'pending';
    event: DomainEvent;
  }> {
    const slug = input.slug ?? this.generateSlug(input.title, input.metalType);
    const moderationStatus = (input.isDevelopmentTrustMode || input.isVerified) ? 'approved' : 'pending';

    const listing = await this.repository.createListing({
      title: input.title,
      slug,
      description: input.description,
      metalType: input.metalType,
      grade: input.grade,
      materialSpec: input.materialSpec,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      priceUnit: input.priceUnit,
      currency: input.currency,
      isNegotiable: input.isNegotiable,
      quantityAvailable: input.quantityAvailable,
      unit: input.unit,
      moq: input.moq,
      leadTime: input.leadTime,
      listingType: input.listingType,
      listingRole: input.listingRole,
      applications: input.applications,
      keywords: input.keywords,
      taxonomyId: input.taxonomyId,
      sellerProfileId: input.sellerProfileId,
      companyId: input.companyId,
      isActive: true,
      moderationStatus,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      expiresAt: input.expiresAt,
    } as CreateListingInput);

    await this.repository.insertSpecifications(listing.id, input.specifications ?? []);
    await this.repository.insertPricingTiers(listing.id, input.pricingTiers ?? []);

    const event: DomainEvent = {
      id: crypto.randomUUID(),
      type: 'listing.created',
      aggregateId: listing.id,
      aggregateType: 'listing',
      occurredAt: new Date().toISOString(),
      actorId: input.actorId,
      correlationId: input.correlationId ?? crypto.randomUUID(),
      version: 1,
      payload: {
        listingId: listing.id,
        slug,
        moderationStatus,
        title: input.title,
      },
    };

    return {
      id: listing.id,
      title: listing.title,
      slug,
      moderationStatus,
      event,
    };
  }

  async moderateListing(input: ListingModerationInput): Promise<{
    id: string;
    title: string;
    previousStatus: string;
    moderationStatus: 'approved' | 'rejected' | 'flagged';
    isActive: boolean;
    notificationSent: boolean;
    event: DomainEvent;
  }> {
    const listing = await this.repository.getBySlug(input.slug);

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    const statusMap: Record<ListingModerationAction, 'approved' | 'rejected' | 'flagged'> = {
      approve: 'approved',
      reject: 'rejected',
      flag: 'flagged',
    };

    const newStatus = statusMap[input.action];
    const isActive = input.action === 'approve';

    await this.repository.updateModeration({
      id: listing.id,
      status: newStatus,
      isActive,
    });

    const sellerUserId = await this.repository.getSellerProfileUserId(listing.sellerProfileId);

    if (sellerUserId) {
      const messages: Record<ListingModerationAction, string> = {
        approve: `Your listing "${listing.title}" has been approved and is now live.`,
        reject: `Your listing "${listing.title}" has been rejected. ${input.notes ? `Reason: ${input.notes}` : 'Please review and resubmit.'}`,
        flag: `Your listing "${listing.title}" has been flagged for review. ${input.notes || ''}`,
      };

      await this.repository.createNotification({
        userId: sellerUserId,
        listingId: listing.id,
        action: input.action,
        title: `Listing ${input.action === 'approve' ? 'Approved' : input.action === 'reject' ? 'Rejected' : 'Flagged'}`,
        message: messages[input.action],
        slug: input.slug,
      });
    }

    const event: DomainEvent = {
      id: crypto.randomUUID(),
      type: 'listing.moderation.updated',
      aggregateId: listing.id,
      aggregateType: 'listing',
      occurredAt: new Date().toISOString(),
      actorId: input.actorId,
      correlationId: input.correlationId ?? crypto.randomUUID(),
      version: 1,
      payload: {
        action: input.action,
        status: newStatus,
        previousStatus: listing.moderationStatus,
        title: listing.title,
        notes: input.notes,
        isActive,
      },
    };

    return {
      id: listing.id,
      title: listing.title,
      previousStatus: listing.moderationStatus,
      moderationStatus: newStatus,
      isActive,
      notificationSent: Boolean(sellerUserId),
      event,
    };
  }

  async listPublicListings(page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    return this.repository.listPublicListings(page, limit);
  }

  async listListingsByModerationStatus(status: string, page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    return this.repository.listListingsByModerationStatus(status, page, limit);
  }

  async getModerationStatusCounts(): Promise<{ pending: number; flagged: number; rejected: number }> {
    return this.repository.getModerationStatusCounts();
  }

  async searchListings(filters: {
    page: number;
    limit: number;
    sort?: string;
    order?: 'asc' | 'desc';
    metalType?: string | null;
    taxonomyId?: string | null;
    listingType?: string | null;
    listingRole?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    isFeatured?: boolean;
    search?: string | null;
    sellerId?: string | null;
    companyId?: string | null;
  }): Promise<{ data: any[]; count: number | null }> {
    return this.repository.searchListings(filters);
  }

  async searchListingsBySupplier(sellerId: string, limit?: number): Promise<any[]> {
    return this.repository.searchListingsBySupplier(sellerId, limit);
  }

  private generateSlug(title: string, metalType?: string | null): string {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (metalType) {
      slug = `${slug}-${metalType.toLowerCase().replace(/\s+/g, '-')}`;
    }

    const suffix = Math.random().toString(36).slice(2, 6);
    return `${slug}-${suffix}`;
  }
}
