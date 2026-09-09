export const MARKETPLACE_ACTIVE_PRODUCT_FILTER = {
  approvalStatus: "approved",
  lifecycleStatus: "active",
} as const;

/**
 * Applies the product-owned half of public marketplace eligibility.
 *
 * Seller verification and public-profile gates are intentionally applied by the
 * caller's seller join because those relationships differ between the legacy
 * and current profile projections. Do not use this for seller or admin reads:
 * those views must retain ineligible products with their blocking reason.
 */
// Supabase query builders encode every chained filter in their generic type.
// Keep this boundary intentionally erased to prevent consumer type recursion.
export function applyMarketplaceProductEligibility(query: any): any {
  return query
    .eq("approval_status", MARKETPLACE_ACTIVE_PRODUCT_FILTER.approvalStatus)
    .eq("lifecycle_status", MARKETPLACE_ACTIVE_PRODUCT_FILTER.lifecycleStatus)
    .eq("is_published", true)
    .eq("is_visible", true);
}

export function isMarketplaceProductEligible(product: {
  approval_status?: unknown;
  lifecycle_status?: unknown;
  is_published?: unknown;
  is_visible?: unknown;
}): boolean {
  return product.approval_status === MARKETPLACE_ACTIVE_PRODUCT_FILTER.approvalStatus &&
    product.lifecycle_status === MARKETPLACE_ACTIVE_PRODUCT_FILTER.lifecycleStatus &&
    product.is_published === true &&
    product.is_visible === true;
}

export function isPublicSellerProfileProduct(product: {
  approval_status?: unknown;
  lifecycle_status?: unknown;
  is_published?: unknown;
  is_visible?: unknown;
}): boolean {
  return isMarketplaceProductEligible(product);
}
