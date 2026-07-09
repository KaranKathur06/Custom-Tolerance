/**
 * Product Publishing Architecture
 * 
 * This document outlines the complete product publishing workflow for the marketplace.
 * 
 * ## Workflow Overview
 * 
 * Seller Product Lifecycle:
 * 1. **Draft** - Seller creates product in dashboard (seller_products table)
 * 2. **Pending Review** - Seller clicks "Publish to Marketplace" → Approval record created
 * 3. **Admin Review** - Admin reviews in approval queue
 * 4. **Approved** - Admin approves → Product published to marketplace (published=true)
 * 5. **Rejected** - Admin rejects with reason → Product stays draft, seller can edit
 * 6. **Published** - Product visible in /marketplace/products
 * 7. **Archived** - Seller removes from marketplace (unpublish)
 * 
 * ## Database Schema
 * 
 * ### seller_products
 * - id: uuid
 * - seller_profile_id: uuid (seller profile FK)
 * - product_name: text
 * - capability: text
 * - materials: text[]
 * - tolerance_capability: text
 * - moq: text
 * - lead_time: text
 * - estimated_price_per_unit: decimal
 * - quantity_available: decimal
 * - certifications: text[]
 * - is_published: boolean
 * - is_featured: boolean
 * - approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected'
 * - approval_notes: text
 * - approved_by: uuid (admin FK)
 * - approved_at: timestamp
 * - published_at: timestamp
 * - listing_id: uuid (FK to listings, used for RFQ/quote sync)
 * - is_visible: boolean
 * 
 * ### product_approvals
 * - id: uuid
 * - seller_product_id: uuid (seller_products FK)
 * - submitted_by: uuid (seller user FK)
 * - reviewed_by: uuid (admin user FK, nullable)
 * - status: 'pending' | 'approved' | 'rejected'
 * - rejection_reason: text
 * - notes: text
 * - created_at: timestamp
 * - reviewed_at: timestamp (nullable)
 * - expires_at: timestamp (30 days)
 * 
 * ### product_events
 * - id: uuid
 * - seller_product_id: uuid (seller_products FK)
 * - listing_id: uuid (listings FK, nullable)
 * - event_type: 'published' | 'rejected' | 'approved' | 'updated' | 'archived'
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - metadata: jsonb
 * - created_at: timestamp
 * - processed_at: timestamp
 * - error_message: text
 * 
 * ### product_search_index
 * - id: uuid
 * - seller_product_id: uuid (seller_products FK)
 * - search_vector: tsvector (PostgreSQL FTS)
 * - keywords: text[]
 * - indexed_at: timestamp
 * 
 * ## API Endpoints
 * 
 * ### Seller APIs
 * 
 * **GET /api/dashboard/seller/products**
 * - List all seller products with publishing status
 * - Returns: { products: SellerProduct[], total: number }
 * 
 * **POST /api/dashboard/seller/products**
 * - Create new seller product
 * - Body: { productName, capability, materials, moq, leadTime, ... }
 * - Returns: { product: SellerProduct }
 * 
 * **PATCH /api/dashboard/seller/products?id={id}**
 * - Update seller product (only when approval_status === 'draft' or 'rejected')
 * - Body: { productName?, capability?, ... }
 * - Returns: { product: SellerProduct }
 * 
 * **DELETE /api/dashboard/seller/products?id={id}**
 * - Delete seller product (only when not published/approved)
 * - Returns: { success: true }
 * 
 * **POST /api/dashboard/seller/products/{id}/publish**
 * - Submit product for marketplace approval
 * - Creates product_approvals record with status='pending'
 * - Updates approval_status to 'pending_review'
 * - Returns: { success: true, approval_id: uuid, approval_status: 'pending' }
 * 
 * ### Public Marketplace API
 * 
 * **GET /api/marketplace?type=products**
 * - List published seller products
 * - Query: search, capability, material, sort, date, page, limit
 * - Filters: is_published=true AND approval_status='approved'
 * - Returns: { products: SellerProduct[], pagination: {...} }
 * 
 * **GET /api/products/search**
 * - Full-text search on published products
 * - Query: q, capability, material, sort, page, limit
 * - Uses product_search_index (PostgreSQL FTS)
 * - Returns: { products: SellerProduct[], pagination: {...} }
 * 
 * **GET /api/products/events**
 * - Real-time product event stream
 * - Query: since (timestamp), type (event_type), limit
 * - For sync/webhooks
 * - Returns: { events: ProductEvent[], timestamp: string }
 * 
 * ### Admin APIs
 * 
 * **GET /api/admin/products/approvals**
 * - List product approval queue
 * - Query: status ('pending'|'approved'|'rejected'), page, limit
 * - Requires: admin role
 * - Returns: { approvals: ProductApproval[], pagination: {...} }
 * 
 * **PATCH /api/admin/products/approvals**
 * - Approve or reject product
 * - Body: { approval_id, action ('approve'|'reject'), rejection_reason?, notes? }
 * - Requires: admin role
 * - On approve: Calls publish_product_to_marketplace() RPC
 * - Returns: { success: true, message: string }
 * 
 * ## Functions & Hooks
 * 
 * ### /lib/products/publishing.ts
 * - publishProductToMarketplace(supabase, productId)
 * - approveProduct(supabase, productId, approvalId, adminNotes?)
 * - rejectProduct(supabase, productId, approvalId, rejectionReason)
 * - archiveProduct(supabase, productId)
 * - getProductHistory(supabase, productId)
 * 
 * ### /lib/products/hooks.ts
 * - useSellerProducts() - Fetch seller's products
 * - usePublishProduct() - Publish product hook
 * - useProductApprovals(filter) - Admin approval queue
 * - useSearchProducts(query, options) - Search published products
 * - useProductEvents(since?) - Real-time event stream
 * 
 * ## Synchronization Strategy
 * 
 * ### Product-to-Listing Sync
 * When product is published and approved:
 * 1. publish_product_to_marketplace() RPC creates listings entry
 * 2. Sets seller_products.listing_id reference
 * 3. Creates product_events record with type='published'
 * 4. Triggers reindex_product_search() for FTS
 * 
 * ### Search Index Updates
 * - Automatic via trigger: trg_seller_products_reindex
 * - Fires on INSERT/UPDATE of seller_products
 * - Updates product_search_index with FTS vector
 * - Keywords array for filtering
 * 
 * ### Event-Driven Notifications
 * - product_events table is source of truth
 * - External systems poll /api/products/events
 * - Can also use Supabase Realtime on product_events table
 * - Events include: published, approved, rejected, archived, updated
 * 
 * ## Quality Assurance Checklist
 * 
 * - [x] Migration creates all tables with indexes
 * - [x] RLS policies restrict access appropriately
 * - [x] Seller products API supports full CRUD
 * - [x] Publishing workflow is reversible
 * - [x] Admin approval queue is functional
 * - [x] Search indexing is automatic
 * - [x] Marketplace shows only published/approved products
 * - [x] Event stream for external sync
 * - [x] Dashboard stats count published products
 * - [x] TypeScript types defined for all models
 * - [x] Zero hardcoded product data
 * - [x] Full audit trail via product_events
 * 
 * ## Next Steps (Phase 3+)
 * 
 * 1. **Webhooks** - Real-time push notifications on product changes
 * 2. **Analytics** - Track product views, inquiries, conversions
 * 3. **A/B Testing** - Test product descriptions, images, pricing
 * 4. **AI Recommendations** - Similar products, upsells
 * 5. **Bulk Operations** - Publish multiple products at once
 * 6. **Product Versioning** - Track product spec changes over time
 * 7. **Inventory Sync** - Automatic quantity updates from ERP
 * 8. **Dynamic Pricing** - Price adjustments based on demand/competition
 */

export const metadata = {
  title: "Product Publishing Architecture",
  description: "Seller product lifecycle and marketplace publishing workflow",
  version: "1.0.0",
  lastUpdated: "2026-07-09",
};
