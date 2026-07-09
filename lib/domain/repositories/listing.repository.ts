import type { SupabaseClient } from '@supabase/supabase-js';

export type ListingModerationAction = 'approve' | 'reject' | 'flag';

export type ListingRecord = {
  id: string;
  title: string;
  moderationStatus: string;
  sellerProfileId: string | null;
};

export type ListingDetail = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  metal_type?: string | null;
  grade?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  moq?: number | null;
  lead_time?: string | null;
  is_active: boolean;
  moderation_status: string;
  created_at: string;
  updated_at: string;
  views_count?: number | null;
  inquiry_count?: number | null;
  listing_media?: unknown[];
  listing_specifications?: unknown[];
  listing_pricing_tiers?: unknown[];
  seller_profiles?: { profile_id?: string } | null;
};

export type CreateListingInput = {
  title: string;
  slug: string;
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
  isActive?: boolean;
  moderationStatus?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  expiresAt?: string | null;
};

export type ListingSpecificationInput = {
  key: string;
  value: string;
  unit?: string | null;
};

export type ListingPricingTierInput = {
  minQuantity: number;
  maxQuantity?: number | null;
  pricePerUnit: number;
  currency?: string;
};

export class ListingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getBySlug(slug: string): Promise<ListingRecord | null> {
    const { data, error } = await this.supabase
      .from('listings')
      .select('id, title, moderation_status, seller_profile_id')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      moderationStatus: data.moderation_status,
      sellerProfileId: data.seller_profile_id,
    };
  }

  async getDetailBySlug(slug: string): Promise<ListingDetail | null> {
    const { data, error } = await this.supabase
      .from('listings')
      .select(`
        id, title, slug, description, metal_type, grade,
        price_min, price_max, currency, moq, lead_time,
        is_active, moderation_status, created_at, updated_at,
        views_count, inquiry_count,
        listing_media(id, url, alt_text, media_type, is_primary, sort_order),
        listing_specifications(id, spec_key, spec_value, unit, sort_order),
        listing_pricing_tiers(id, min_quantity, max_quantity, price_per_unit, currency, sort_order),
        seller_profiles:seller_profile_id(profile_id)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as ListingDetail;
  }

  async listPublicListings(page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    const { data, error, count } = await this.supabase
      .from('listings')
      .select(`
        id, title, slug, description, metal_type, grade,
        price_min, price_max, currency, moq, lead_time,
        is_active, moderation_status, created_at,
        listing_media(id, url, alt_text, is_primary),
        companies:company_id(id, name, logo_url, city, state)
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return { data: data || [], count };
  }

  async listListingsByModerationStatus(status: string, page: number, limit: number): Promise<{ data: any[]; count: number | null }> {
    const { data, error, count } = await this.supabase
      .from('listings')
      .select(`
        id, title, slug, description, metal_type, grade,
        price_min, price_max, currency, listing_type,
        moderation_status, is_active, created_at, updated_at,
        listing_media(id, url, alt_text, is_primary),
        companies:company_id(id, name, logo_url, is_verified),
        seller_profiles:seller_profile_id(id, company_name, verification_status,
          profiles:profile_id(full_name, email)
        )
      `, { count: 'exact' })
      .eq('moderation_status', status)
      .order('created_at', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    return { data: data || [], count };
  }

  async getModerationStatusCounts(): Promise<{ pending: number; flagged: number; rejected: number }> {
    const [pending, flagged, rejected] = await Promise.all([
      this.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      this.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
      this.supabase.from('listings').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
    ]);

    return {
      pending: pending.count ?? 0,
      flagged: flagged.count ?? 0,
      rejected: rejected.count ?? 0,
    };
  }

  async getListingWithOwnerBySlug(slug: string): Promise<{ id: string; seller_profile_id: string | null; seller_profiles?: Array<{ profile_id?: string }> | null } | null> {
    const { data, error } = await this.supabase
      .from('listings')
      .select('id, seller_profile_id, seller_profiles:seller_profile_id(profile_id)')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async hasRecentView(viewKey: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rate_limits')
      .select('id')
      .eq('identifier', viewKey)
      .eq('action', 'product_view')
      .gt('window_end', new Date().toISOString())
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data);
  }

  async incrementListingViews(listingId: string, currentCount: number | null | undefined): Promise<void> {
    try {
      await this.supabase.rpc('increment_listing_views', { listing_id: listingId });
      return;
    } catch {
      await this.supabase
        .from('listings')
        .update({ views_count: (currentCount ?? 0) + 1 })
        .eq('id', listingId);
    }
  }

  async recordViewLimit(viewKey: string, windowEnd: string): Promise<void> {
    const { error } = await this.supabase.from('rate_limits').insert({
      identifier: viewKey,
      action: 'product_view',
      attempts: 1,
      window_start: new Date().toISOString(),
      window_end: windowEnd,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateListing(id: string, updates: Record<string, any>): Promise<any> {
    const { data, error } = await this.supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update listing');
    }

    return data;
  }

  async softDeleteListing(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('listings')
      .update({ is_active: false, moderation_status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteSpecifications(listingId: string): Promise<void> {
    const { error } = await this.supabase
      .from('listing_specifications')
      .delete()
      .eq('listing_id', listingId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deletePricingTiers(listingId: string): Promise<void> {
    const { error } = await this.supabase
      .from('listing_pricing_tiers')
      .delete()
      .eq('listing_id', listingId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateModeration(input: {
    id: string;
    status: 'approved' | 'rejected' | 'flagged';
    isActive: boolean;
    notes?: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('listings')
      .update({
        moderation_status: input.status,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getSellerProfileUserId(sellerProfileId: string | null): Promise<string | null> {
    if (!sellerProfileId) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('seller_profiles')
      .select('profile_id')
      .eq('id', sellerProfileId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.profile_id;
  }

  async createListing(input: CreateListingInput): Promise<{ id: string; title: string; slug: string; moderationStatus: string }> {
    const { data, error } = await this.supabase
      .from('listings')
      .insert({
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        metal_type: input.metalType ?? null,
        grade: input.grade ?? null,
        material_spec: input.materialSpec ?? null,
        price_min: input.priceMin ?? null,
        price_max: input.priceMax ?? null,
        price_unit: input.priceUnit ?? 'per MT',
        currency: input.currency ?? 'INR',
        is_negotiable: input.isNegotiable !== false,
        quantity_available: input.quantityAvailable ?? null,
        unit: input.unit ?? 'MT',
        moq: input.moq ?? null,
        lead_time: input.leadTime ?? null,
        listing_type: input.listingType ?? 'product',
        listing_role: input.listingRole ?? 'supplier',
        applications: input.applications ?? [],
        keywords: input.keywords ?? [],
        taxonomy_id: input.taxonomyId ?? null,
        seller_profile_id: input.sellerProfileId,
        company_id: input.companyId ?? null,
        is_active: input.isActive ?? true,
        moderation_status: input.moderationStatus ?? 'pending',
        seo_title: input.seoTitle ?? input.title,
        seo_description: input.seoDescription ?? (input.description?.slice(0, 160) ?? null),
        expires_at: input.expiresAt ?? null,
      })
      .select('id, title, slug, moderation_status')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create listing');
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      moderationStatus: data.moderation_status,
    };
  }

  async insertSpecifications(listingId: string, specifications: ListingSpecificationInput[]): Promise<void> {
    if (!specifications.length) {
      return;
    }

    const { error } = await this.supabase.from('listing_specifications').insert(
      specifications.map((spec, index) => ({
        listing_id: listingId,
        spec_key: spec.key,
        spec_value: spec.value,
        unit: spec.unit ?? null,
        sort_order: index,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async insertPricingTiers(listingId: string, pricingTiers: ListingPricingTierInput[]): Promise<void> {
    if (!pricingTiers.length) {
      return;
    }

    const { error } = await this.supabase.from('listing_pricing_tiers').insert(
      pricingTiers.map((tier, index) => ({
        listing_id: listingId,
        min_quantity: tier.minQuantity,
        max_quantity: tier.maxQuantity ?? null,
        price_per_unit: tier.pricePerUnit,
        currency: tier.currency ?? 'INR',
        sort_order: index,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
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
    let query = this.supabase
      .from('listings')
      .select(`
        id, title, slug, description, metal_type, grade, material_spec,
        price_min, price_max, price_unit, currency, is_negotiable,
        quantity_available, unit, moq, lead_time,
        listing_type, listing_role, applications, keywords,
        is_featured, views_count, inquiry_count,
        seo_title, seo_description,
        is_active, moderation_status, created_at, updated_at,
        seller_profile_id, company_id,
        taxonomy:taxonomy_id(id, name, slug, type),
        listing_media(id, url, alt_text, media_type, is_primary, sort_order),
        companies:company_id(id, name, logo_url, city, state)
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('moderation_status', 'approved');

    // Apply filters
    if (filters.metalType) query = query.eq('metal_type', filters.metalType);
    if (filters.taxonomyId) query = query.eq('taxonomy_id', filters.taxonomyId);
    if (filters.listingType) query = query.eq('listing_type', filters.listingType);
    if (filters.listingRole) query = query.eq('listing_role', filters.listingRole);
    if (filters.minPrice) query = query.gte('price_min', filters.minPrice);
    if (filters.maxPrice) query = query.lte('price_max', filters.maxPrice);
    if (filters.isFeatured === true) query = query.eq('is_featured', true);
    if (filters.sellerId) query = query.eq('seller_profile_id', filters.sellerId);
    if (filters.companyId) query = query.eq('company_id', filters.companyId);
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,metal_type.ilike.%${filters.search}%,grade.ilike.%${filters.search}%`
      );
    }

    // Sort mapping
    const sortColumn = filters.sort === 'price'
      ? 'price_min'
      : filters.sort === 'views'
      ? 'views_count'
      : filters.sort === 'newest'
      ? 'created_at'
      : filters.sort || 'created_at';

    query = query
      .order(sortColumn, { ascending: filters.order === 'asc' })
      .range(
        (filters.page - 1) * filters.limit,
        filters.page * filters.limit - 1,
      );

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return { data: data || [], count };
  }

  async searchListingsBySupplier(
    sellerId: string,
    limit: number = 20,
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('listings')
      .select(
        'id, title, slug, metal_type, grade, price_min, price_max, currency, listing_media(url, is_primary)',
      )
      .eq('seller_profile_id', sellerId)
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async createNotification(input: {
    userId: string;
    listingId: string;
    action: ListingModerationAction;
    title: string;
    message: string;
    slug: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert({
      user_id: input.userId,
      type: 'listing_moderation',
      title: input.title,
      message: input.message,
      data: { listing_id: input.listingId, action: input.action, slug: input.slug },
      is_read: false,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
