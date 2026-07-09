/**
 * Enhanced marketplace search with multi-field indexing
 * Searches across: supplier name, description, capabilities, products, industries, cities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { searchMarketplaceSuppliers } from '@/lib/marketplace/supplier-query';
import { ListingRepository } from '@/lib/domain/repositories/listing.repository';
import { ListingService } from '@/lib/domain/services/listing.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, results: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
        { status: 503 }
      );
    }

    const url = request.nextUrl;
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const type = url.searchParams.get('type') || 'all'; // 'all', 'suppliers', 'products'
    const includeSeeded = url.searchParams.get('includeSeeded') === 'true';

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        message: 'Query must be at least 2 characters'
      });
    }

    // ─── 1. SEARCH SUPPLIERS (canonical public.suppliers via RPC) ───
    let supplierResults: any[] = [];
    let supplierTotal = 0;
    if (type === 'all' || type === 'suppliers') {
      try {
        const result = await searchMarketplaceSuppliers(supabase, {
          query: q,
          page,
          pageSize: limit,
          includeSeeded,
        });

        supplierTotal = result.totalCount;
        supplierResults = result.suppliers.map((s) => ({
          type: 'supplier',
          id: s.id,
          name: s.company_name,
          slug: s.slug,
          description: s.short_description,
          verification_status: s.verification_status,
          response_rate: s.response_rate,
          completion_rate: s.completion_rate,
          export_capability: s.export_capability,
          years_in_business: s.years_in_business,
          trust_level: s.trust_level,
          trust_score: s.trust_score,
          capabilities: s.capabilities.map((item) => item.name),
          products: s.products.map((item) => item.name),
          industries: s.industries.map((item) => item.name),
          href: `/suppliers/${s.slug}`,
        }));
      } catch (searchError) {
        console.error('[marketplace/search] supplier RPC failed', searchError);
      }
    }

    // ─── 2. SEARCH PRODUCTS ───
    let productResults: any[] = [];
    let productTotal = 0;
    if (type === 'all' || type === 'products') {
      const listingService = new ListingService(new ListingRepository(supabase));
      try {
        const { data: products, count } = await listingService.searchListings({
          page,
          limit,
          search: q,
        });

        productTotal = count || 0;
        productResults = products.map((p: any) => ({
          type: 'product',
          id: p.id,
          title: p.title,
          description: p.description,
          metal_type: p.metal_type,
          grade: p.grade,
          price_min: p.price_min,
          price_max: p.price_max,
          moq: p.moq,
          supplier: p.companies ? {
            id: p.companies.id,
            name: p.companies.name,
            slug: p.companies.slug,
            verified: true,
          } : null,
        }));
      } catch (prodError) {
        console.error('[marketplace/search] listing search failed', prodError);
      }
    }

    // ─── 3. COMBINE & RETURN ───
    const allResults = type === 'all'
      ? [...supplierResults, ...productResults].slice(0, limit)
      : type === 'suppliers'
      ? supplierResults
      : productResults;

    return NextResponse.json({
      success: true,
      results: allResults,
      pagination: {
        page,
        limit,
        total: supplierTotal + productTotal,
        totalPages: Math.ceil((supplierTotal + productTotal) / limit),
      },
      query: q,
      type,
    });
  } catch (err: any) {
    console.error('[marketplace/search]', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message }, results: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      { status: 500 }
    );
  }
}
