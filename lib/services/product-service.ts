export type ProductDraftPhaseState = {
  productName?: string;
  priceType?: string;
  minPrice?: number | string | null;
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
    hasValue(draft.minPrice) &&
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
