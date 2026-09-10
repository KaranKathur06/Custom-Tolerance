/**
 * Metal Hub — Public Marketplace API v3
 * Product-first discovery: approved seller listings.
 * Also supports buyer RFQs and supplier profiles via tabs.
 *
 * GET /api/marketplace
 * Query: type ('products'|'buyers'|'suppliers'), page, limit, search, location, capability, category, industry, verified, sort, date
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { parseSupplierSearchParams } from '@/lib/marketplace/search';
import { searchMarketplaceSuppliers } from '@/lib/marketplace/supplier-query';
import { marketplaceStatusAllowsPublicRead, readBooleanSetting, readEnumSetting } from '@/lib/settings/policy';
import { applyMarketplaceProductEligibility } from '@/lib/products/eligibility';

export const dynamic = 'force-dynamic';

const MARKETPLACE_CITIES = [
  'Rajkot',
  'Ahmedabad',
  'Pune',
  'Mumbai',
  'Chennai',
  'Coimbatore',
  'Bengaluru',
  'Vadodara',
  'Faridabad',
  'Surat',
];

function normalizeCityFilter(values: string[]) {
  return values.map((value) => {
    const match = MARKETPLACE_CITIES.find(
      (city) =>
        city.toLowerCase() === value.toLowerCase() ||
        city.toLowerCase().replace(/\s+/g, '-') === value.toLowerCase(),
    );
    return match ?? value;
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { type: 'products', products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
        { status: 200 },
      );
    }

    const url = request.nextUrl;
    const type = url.searchParams.get('type') || 'products';
    const filters = parseSupplierSearchParams(url.searchParams);
    const marketplaceStatus = await readEnumSetting(supabase, 'marketplace_status', 'open');
    if (!marketplaceStatusAllowsPublicRead(marketplaceStatus)) {
      return NextResponse.json({ type, products: [], suppliers: [], inquiries: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    if (type === 'products' && !(await readBooleanSetting(supabase, 'product_marketplace_enabled', true))) {
      return NextResponse.json({ type: 'products', products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    if (type === 'suppliers' && !(await readBooleanSetting(supabase, 'supplier_directory_enabled', true))) {
      return NextResponse.json({ type: 'suppliers', suppliers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }
    if (type === 'buyers' && !(await readBooleanSetting(supabase, 'rfq_marketplace_enabled', true))) {
      return NextResponse.json({ type: 'buyers', inquiries: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }

    // Default: Published seller products
    if (type === 'products') {
      const search = filters.query || '';
      const page = filters.page ?? 1;
      const limit = filters.pageSize ?? 20;
      const offset = (page - 1) * limit;
      const dateFilter = url.searchParams.get('date') || '';

      let query = applyMarketplaceProductEligibility(supabase
        .from('seller_products')
        .select(
          `
          id, product_name, capability, materials, tolerance_capability, moq,
          lead_time, estimated_price_per_unit, quantity_available, is_featured,
          published_at, seller_profile_id, profile_id, listing_id,
          product_images(url, storage_path, is_primary, display_order),
          seller_profiles!inner(
            id, profile_completion_percent, company_id, verification_status,
            companies(name, cities(name))
          )
          `,
          { count: 'exact' }
        ));

      if (search) {
        query = query.or(`product_name.ilike.%${search}%,capability.ilike.%${search}%,tolerance_capability.ilike.%${search}%`);
      }

      if (filters.capabilities && filters.capabilities.length > 0) {
        query = query.eq('capability', filters.capabilities[0]);
      }

      if (filters.industries && filters.industries.length > 0) {
        query = query.contains('materials', filters.industries);
      }

      if (filters.verification === 'verified') {
        query = query.eq('seller_profiles.verification_status', 'approved');
      }

      if (dateFilter) {
        const now = new Date();
        let cutoff: Date | null = null;
        if (dateFilter === 'last-24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (dateFilter === 'last-7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (dateFilter === 'last-30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (cutoff) query = query.gte('published_at', cutoff.toISOString());
      }

      // Sort options
      const sortParam = url.searchParams.get('sort') || 'latest';
      if (sortParam === 'latest') {
        query = query.order('published_at', { ascending: false });
      } else if (sortParam === 'featured') {
        query = query.order('is_featured', { ascending: false }).order('published_at', { ascending: false });
      } else if (sortParam === 'price') {
        query = query.order('estimated_price_per_unit', { ascending: true });
      }

      const { data: products, count, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('[marketplace/products]', error.message);
        return NextResponse.json(
          { type: 'products', products: [], pagination: { page, limit, total: 0, totalPages: 0 }, message: 'Unable to load marketplace products.' },
          { status: 500 },
        );
      }

      const normalizedProducts = (products || []).map((product: any) => {
        const images = Array.isArray(product.product_images) ? product.product_images : [];
        const primaryImage = [...images]
          .filter((image) => typeof image?.url === 'string' && image.url.trim())
          .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || (a.display_order ?? 0) - (b.display_order ?? 0))[0] ?? null;
        const sellerProfile = Array.isArray(product.seller_profiles) ? product.seller_profiles[0] : product.seller_profiles;
        const company = sellerProfile && (Array.isArray(sellerProfile.companies) ? sellerProfile.companies[0] : sellerProfile.companies);
        const city = company && (Array.isArray(company.cities) ? company.cities[0] : company.cities);

        return {
          ...product,
          featured_image: primaryImage ? { url: primaryImage.url, alt: product.product_name } : null,
          seller_profile: sellerProfile ? {
            id: sellerProfile.id,
            companyId: sellerProfile.company_id,
            companyName: company?.name ?? null,
            location: city?.name ?? null,
            isVerified: sellerProfile.verification_status === 'approved',
          } : null,
        };
      });

      return NextResponse.json({
        type: 'products',
        products: normalizedProducts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // Supplier profiles (legacy, for company pages)
    if (type === 'suppliers') {
      const result = await searchMarketplaceSuppliers(supabase, {
        query: filters.query,
        capabilities: filters.capabilities,
        industries: filters.industries,
        products: filters.products,
        certifications: filters.certifications,
        cities: filters.cities?.length ? normalizeCityFilter(filters.cities) : undefined,
        verification: filters.verification,
        includeSeeded: filters.includeSeeded,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      return NextResponse.json({
        type: 'suppliers',
        suppliers: result.suppliers,
        pagination: {
          page: result.page,
          limit: result.pageSize,
          total: result.totalCount,
          totalPages: result.pageCount,
        },
      });
    }

    // Buyer RFQs (secondary view)
    if (type === 'buyers') {
      const search = filters.query || '';
      const page = filters.page ?? 1;
      const limit = filters.pageSize ?? 20;
      const offset = (page - 1) * limit;
      const dateFilter = url.searchParams.get('date') || '';

      let query = supabase
        .from('rfqs')
        .select('id, title, slug, description, quantity, budget_range, required_by, status, created_at, buyer_user_id', { count: 'exact' })
        .eq('status', 'open');

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (dateFilter) {
        const now = new Date();
        let cutoff: Date | null = null;
        if (dateFilter === 'last-24h') cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (dateFilter === 'last-7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (dateFilter === 'last-30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (cutoff) query = query.gte('created_at', cutoff.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data: inquiries, count, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('[marketplace/buyers]', error.message);
      }

      return NextResponse.json({
        type: 'buyers',
        inquiries: inquiries || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // Fallback (should not reach here given the type checks above)
    return NextResponse.json(
      { type: 'products', products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown marketplace error';
    console.error('[marketplace] Unhandled error:', message);
    return NextResponse.json(
      { type: 'products', products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, message: 'Unable to load marketplace products.' },
      { status: 500 },
    );
  }
}
