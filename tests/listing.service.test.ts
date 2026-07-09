import test from 'node:test';
import assert from 'node:assert/strict';
import { ListingService } from '@/lib/domain/services/listing.service';

class StubListingRepository {
  public createdListings: any[] = [];

  async getSellerProfileByUserId() {
    return { id: 'seller-profile-1', company_id: 'company-1' };
  }

  async createListing(input: any) {
    this.createdListings.push(input);
    return {
      id: 'listing-1',
      ...input,
    };
  }

  async insertSpecifications() {
    return null;
  }

  async insertPricingTiers() {
    return null;
  }

  async listPublicListings(page: number, limit: number) {
    return {
      data: [
        { id: 'listing-1', title: 'Steel Plates', moderation_status: 'approved', is_active: true },
        { id: 'listing-2', title: 'Aluminum Coils', moderation_status: 'approved', is_active: true },
      ],
      count: 2,
    };
  }

  async searchListings(filters: any) {
    return {
      data: [
        { id: 'listing-1', title: 'Steel Plates', metal_type: 'Steel', price_min: 100, price_max: 200 },
      ],
      count: 1,
    };
  }

  async searchListingsBySupplier(sellerId: string, limit?: number) {
    return [
      { id: 'listing-1', title: 'Steel Plates', metal_type: 'Steel' },
      { id: 'listing-2', title: 'Aluminum Coils', metal_type: 'Aluminum' },
    ];
  }

  async listListingsByModerationStatus(status: string, page: number, limit: number) {
    return {
      data: [
        { id: 'listing-pending-1', title: 'Pending Listing', moderation_status: 'pending' },
      ],
      count: 1,
    };
  }

  async getModerationStatusCounts() {
    return { pending: 5, flagged: 2, rejected: 1 };
  }
}

test('createListing auto-approves verified sellers and stores a slug', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.createListing({
    actorId: 'user-1',
    title: 'Test Listing',
    description: 'A sample listing',
    metalType: 'Steel',
    sellerProfileId: 'seller-profile-1',
    companyId: 'company-1',
    isDevelopmentTrustMode: false,
    isVerified: true,
  });

  assert.equal(result.moderationStatus, 'approved');
  assert.equal(repository.createdListings.length, 1);
  assert.match(repository.createdListings[0].slug, /test-listing/);
  assert.equal(result.title, 'Test Listing');
});

test('listPublicListings delegates to repository', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.listPublicListings(1, 20);

  assert.equal(result.data.length, 2);
  assert.equal(result.count, 2);
  assert.equal(result.data[0].title, 'Steel Plates');
});

test('searchListings applies filters and delegates to repository', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.searchListings({
    page: 1,
    limit: 20,
    metalType: 'Steel',
    minPrice: 100,
    maxPrice: 200,
  });

  assert.equal(result.data.length, 1);
  assert.equal(result.count, 1);
  assert.equal(result.data[0].title, 'Steel Plates');
});

test('searchListingsBySupplier returns supplier listings', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.searchListingsBySupplier('seller-profile-1', 20);

  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Steel Plates');
  assert.equal(result[1].title, 'Aluminum Coils');
});

test('listListingsByModerationStatus delegates to repository', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.listListingsByModerationStatus('pending', 1, 20);

  assert.equal(result.data.length, 1);
  assert.equal(result.count, 1);
  assert.equal(result.data[0].moderation_status, 'pending');
});

test('getModerationStatusCounts returns status distribution', async () => {
  const repository = new StubListingRepository();
  const service = new ListingService(repository as any);

  const result = await service.getModerationStatusCounts();

  assert.equal(result.pending, 5);
  assert.equal(result.flagged, 2);
  assert.equal(result.rejected, 1);
});
