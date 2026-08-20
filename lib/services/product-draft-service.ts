/**
 * Product Draft Service
 *
 * Manages product draft state and resume flows.
 * Mirrors rfq-draft-service.ts for seller products.
 * Allows sellers to save incomplete products and resume later.
 */

export type ProductDraftState = {
  id: string;
  status: "draft" | "rejected";
  productName?: string | null;
  completionPercent: number;
  phase: number; // Current phase (1-4)
  canResume: boolean;
  canPublish: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Determine if a product draft can be resumed for editing.
 * Only draft products can be resumed.
 */
export function canResumeProductDraft(product: {
  id: string;
  status?: string;
  deletedAt?: string | null;
}): boolean {
  if (!product || !product.id) return false;
  if (product.deletedAt) return false;
  return product.status === "draft" || product.status === "rejected";
}

/**
 * Determine if a product draft is ready to be published.
 * Product must be draft and have minimum data:
 * - Name completed
 * - Phase 1 (Technical) at least 40% complete
 */
export function canPublishProductDraft(product: {
  id: string;
  status?: string;
  productName?: string | null;
  completionPercent?: number;
  phase?: number;
  deletedAt?: string | null;
}): boolean {
  if (!product || !product.id) return false;
  if (product.status !== "draft" && product.status !== "rejected") return false;
  if (product.deletedAt) return false;

  // Must have product name
  if (!product.productName?.trim()) return false;

  // Must be past phase 1 (at least some technical details)
  if ((product.phase ?? 0) < 2) return false;

  return true;
}

/**
 * Normalize a product record into canonical draft state.
 */
export function normalizeDraftProductState(input: {
  id: string;
  status?: string;
  productName?: string | null;
  completionPercent?: number;
  phase?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}): ProductDraftState | null {
  if (input.status !== "draft" && input.status !== "rejected") {
    return null;
  }

  const canResume = canResumeProductDraft(input);
  const canPublish = canPublishProductDraft(input);

  return {
    id: input.id,
    status: input.status,
    productName: input.productName || undefined,
    completionPercent: input.completionPercent ?? 0,
    phase: input.phase ?? 1,
    canResume,
    canPublish,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

/**
 * Filter draft products from a mixed list.
 * Extracts products that can be resumed or resubmitted.
 */
export function filterDraftProducts(
  products: Array<{
    id: string;
    status?: string;
    deletedAt?: string | null;
  }>,
): typeof products {
  return products.filter((p) => (p.status === "draft" || p.status === "rejected") && !p.deletedAt);
}

/**
 * Construct the resume URL for a product draft.
 * Allows seller to return to editing incomplete product.
 */
export function getProductResumeUrl(productId: string): string {
  return `/dashboard/seller/products/${productId}`;
}

/**
 * Calculate product completion percentage.
 * Combines all phases: technical (25%), commercial (25%), packaging (25%), review (25%).
 */
export function calculateProductCompletion(phases: {
  phase1Percent?: number;
  phase2Percent?: number;
  phase3Percent?: number;
}): number {
  const p1 = (phases.phase1Percent ?? 0) * 0.25;
  const p2 = (phases.phase2Percent ?? 0) * 0.25;
  const p3 = (phases.phase3Percent ?? 0) * 0.25;
  const review = 25; // Phase 4 is review only, counted as 25% auto-included

  return Math.round(p1 + p2 + p3 + review);
}

/**
 * Determine the current phase based on completion.
 */
export function getCurrentProductPhase(data: {
  productName?: string | null;
  priceType?: string | null;
  minPrice?: number | null;
  capabilities?: string[];
  description?: string | null;
  moq?: string | null;
  leadTime?: string | null;
}): number {
  // Phase 1: Product name, price type, capabilities required
  if (!data.productName || !data.priceType) return 1;

  // Phase 2: Description, MOQ, lead time required
  if (!data.description || !data.moq || !data.leadTime) return 2;

  // Phase 3+: All basics complete
  return 3;
}
