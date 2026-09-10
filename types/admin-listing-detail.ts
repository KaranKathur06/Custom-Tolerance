/**
 * Canonical types for Admin Listing Detail view
 * 
 * This file defines the authoritative data structures that flow through the admin review system.
 * Used by both API (GET /api/admin/listings/[id]) and UI (app/ops/admin/listings/[id]/page.tsx)
 * 
 * Purpose: Ensure type-safe data contracts between backend and frontend
 */

/**
 * Product relationship data - normalized to string arrays
 * These come from normalized join tables (product_capabilities, product_industries, etc.)
 * and are extracted via relationValues() to primitive string arrays
 */
export interface ProductRelations {
  /** Capabilities extracted from product_capabilities join table */
  capabilities: string[];
  
  /** Industries extracted from product_industries join table */
  industries: string[];
  
  /** Materials extracted from product_materials join table */
  materials: string[];
  
  /** Grades extracted from product_grades join table */
  grades: string[];
  
  /** Payment terms extracted from product_payment_terms join table */
  paymentTerms: string[];
  
  /** Incoterms extracted from product_incoterms join table */
  incoterms: string[];
}

/**
 * Seller profile information (minimal subset for admin review)
 */
export interface SellerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

/**
 * Product approval record
 */
export interface ProductApproval {
  id: string;
  seller_product_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
}

/**
 * Product image metadata
 */
export interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * Complete seller product for admin review
 * 
 * Data contract guarantees:
 * - All fields from seller_products table are present (may be null)
 * - Related data (approvals, images, relations) are normalized and deduplicated
 * - No artificial truncation or limit on array items
 * - No artificial limit on text field length
 * 
 * Rendering guidelines:
 * - String fields: display as-is, preserve formatting (pre-wrap)
 * - Text areas: word-break: break-word to handle long unbroken text
 * - Arrays: display all items, join with ", "
 * - Empty arrays: display "Not provided"
 * - Null fields: display "Not provided"
 */
export interface AdminListingDetailProduct {
  // Identity
  id: string;
  profile_id: string;
  product_name: string;
  description: string | null;
  product_description: string | null; // legacy field
  
  // Country of origin (multiple field name variants for compatibility)
  country_of_origin: string | null;
  countryOfOrigin: string | null; // alternate
  origin_country: string | null; // alternate
  
  // Technical specifications
  specification: string | null;
  tolerance_capability: string | null;
  quality_certificate: string | null;
  brand_marking: 'yes' | 'no' | 'other' | null;
  brand_marking_other: string | null;
  dies_and_tools: 'yes' | 'no' | null;
  estimated_tool_cost: number | null;
  tool_ownership: string | null;
  tool_lead_time: string | null;
  
  // Commercial terms
  price_type: string | null;
  currency: string | null;
  price_unit: string | null;
  min_price: number | null;
  max_price: number | null;
  moq: string | null;
  monthly_capacity: number | null;
  production_capacity_unit: string | null;
  lead_time: string | null;
  payment_terms: string | null; // scalar fallback
  paymentTerms: string | null; // alternate
  incoterms: string | null; // scalar fallback
  delivery_terms: string | null;
  free_sample: boolean | null;
  sample_shipping_cost: string | null;
  third_party_inspection: boolean | null;
  
  // Packaging and logistics
  weight_value: number | null;
  weight_unit: string | null;
  dim_length: number | null;
  dim_width: number | null;
  dim_height: number | null;
  dim_unit: string | null;
  shipping_type: string | null;
  primary_packaging: string | null;
  secondary_packaging: string | null;
  packaging_notes: string | null;
  
  // Lifecycle and visibility
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | null;
  lifecycle_status: 'draft' | 'published' | 'archived' | null;
  is_published: boolean;
  is_visible: boolean;
  draft_version: number;
  
  // Legacy scalar columns (fallback only, use relations arrays instead)
  capabilities: string | null;
  capability: string | null;
  industries: string | null;
  materials: string | null;
  grades: string | null;
  
  // Related entity
  profiles?: SellerProfile | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  [key: string]: any; // Allow other fields from database
}

/**
 * Admin Listing Detail response payload
 * 
 * Returned by: GET /api/admin/listings/[id]
 * Consumed by: app/ops/admin/listings/[id]/page.tsx
 */
export interface AdminListingDetailPayload {
  success: boolean;
  data: {
    product: AdminListingDetailProduct;
    approvals: ProductApproval[];
    images: ProductImage[];
    relations: ProductRelations;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Approval action request
 * 
 * Sent by: Admin detail page when clicking Approve/Reject
 * To: PATCH /api/admin/products/approvals
 */
export interface ApprovalActionRequest {
  approval_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
  notes?: string;
}

/**
 * Approval action response
 * 
 * Returned by: PATCH /api/admin/products/approvals
 */
export interface ApprovalActionResponse {
  success: boolean;
  product?: {
    id: string;
    lifecycle_status: 'draft' | 'published' | 'archived';
    approval_status: 'approved' | 'rejected';
    draft_version: number;
  };
  error?: {
    code: 'APPROVAL_NOT_FOUND' | 'APPROVAL_NOT_PENDING' | 'APPROVAL_ALREADY_REVIEWED' | string;
    message: string;
  };
}
