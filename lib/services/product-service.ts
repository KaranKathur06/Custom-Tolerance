export type ProductDraftPhaseState = {
  productName?: string;
  priceType?: string;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  currency?: string;
  capabilities?: unknown[];
  materials?: unknown[];
  tolerance?: string | null;
  description?: string;
  moq?: number | string | null;
  leadTime?: string | null;
  productionCapacity?: number | string | null;
  countryOfOrigin?: string | null;
  freeSample?: string | null;
  paymentTerms?: unknown[];
};

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return value !== undefined && value !== null && value !== false;
}

function phaseOneComplete(draft: ProductDraftPhaseState): boolean {
  return (
    hasValue(draft.productName) &&
    hasValue(draft.priceType) &&
    (draft.priceType === "ask_for_price" || hasValue(draft.minPrice)) &&
    (draft.priceType !== "price_range" || hasValue(draft.maxPrice)) &&
    hasValue(draft.currency) &&
    hasValue(draft.capabilities) &&
    hasValue(draft.materials) &&
    hasValue(draft.tolerance)
  );
}

function phaseTwoComplete(draft: ProductDraftPhaseState): boolean {
  return (
    hasValue(draft.description) &&
    hasValue(draft.moq) &&
    hasValue(draft.leadTime) &&
    hasValue(draft.productionCapacity) &&
    hasValue(draft.countryOfOrigin) &&
    hasValue(draft.freeSample) &&
    hasValue(draft.paymentTerms)
  );
}

export function getMissingPhaseFields(draft: ProductDraftPhaseState, phase: number): string[] {
  const missing: string[] = [];

  if (phase >= 2) {
    if (!hasValue(draft.productName)) missing.push("Product name");
    if (!hasValue(draft.priceType)) missing.push("Pricing model");
    if (draft.priceType !== "ask_for_price" && !hasValue(draft.minPrice)) missing.push("Minimum price");
    if (draft.priceType === "price_range" && !hasValue(draft.maxPrice)) missing.push("Maximum price");
    if (!hasValue(draft.currency)) missing.push("Currency");
    if (!hasValue(draft.capabilities)) missing.push("Product capabilities");
    if (!hasValue(draft.materials)) missing.push("Materials");
    if (!hasValue(draft.tolerance)) missing.push("Tolerance");
  }

  if (phase >= 3) {
    if (!hasValue(draft.description)) missing.push("Description");
    if (!hasValue(draft.moq)) missing.push("Minimum order quantity");
    if (!hasValue(draft.leadTime)) missing.push("Lead time");
    if (!hasValue(draft.productionCapacity)) missing.push("Production capacity");
    if (!hasValue(draft.countryOfOrigin)) missing.push("Country of origin");
    if (!hasValue(draft.freeSample)) missing.push("Free sample");
    if (!hasValue(draft.paymentTerms)) missing.push("Payment terms");
  }

  return missing;
}

export function canEnterPhase(draft: ProductDraftPhaseState, phase: number): boolean {
  if (phase <= 1) return true;

  if (phase >= 2 && !phaseOneComplete(draft)) {
    return false;
  }

  if (phase >= 3 && !phaseTwoComplete(draft)) {
    return false;
  }

  return true;
}
