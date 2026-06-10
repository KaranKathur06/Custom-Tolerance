export const GUEST_RFQ_STORAGE_KEY = "mh_guest_rfq";

export type RfqFrequency = "one_time" | "monthly" | "quarterly" | "annual";

export type GuestRfqDraft = {
  version: 1;
  savedAt: string;
  productName: string;
  materialGrade: string;
  manufacturingProcess: string;
  industryId: string;
  capabilityId: string;
  description: string;
  quantity: string;
  unit: string;
  moqRequired: boolean;
  budgetMin: string;
  budgetMax: string;
  deliveryState: string;
  deliveryCity: string;
  deliveryDate: string;
  deliveryTimeline: string;
  frequency: RfqFrequency;
  supplierSlug: string | null;
  pendingFileNames: string[];
};

export function createEmptyGuestRfqDraft(): GuestRfqDraft {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    productName: "",
    materialGrade: "",
    manufacturingProcess: "",
    industryId: "",
    capabilityId: "",
    description: "",
    quantity: "",
    unit: "MT",
    moqRequired: false,
    budgetMin: "",
    budgetMax: "",
    deliveryState: "",
    deliveryCity: "",
    deliveryDate: "",
    deliveryTimeline: "",
    frequency: "one_time",
    supplierSlug: null,
    pendingFileNames: [],
  };
}

export function readGuestRfqDraft(): GuestRfqDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_RFQ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestRfqDraft;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestRfqDraft(draft: GuestRfqDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    GUEST_RFQ_STORAGE_KEY,
    JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
  );
}

export function clearGuestRfqDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_RFQ_STORAGE_KEY);
}

export function guestDraftToApiPayload(draft: GuestRfqDraft) {
  return {
    title: draft.productName.trim(),
    description: buildGuestDescription(draft),
    quantity: draft.quantity.trim(),
    unit: draft.unit,
    budget_min: draft.budgetMin ? parseInt(draft.budgetMin, 10) : null,
    budget_max: draft.budgetMax ? parseInt(draft.budgetMax, 10) : null,
    industry_id: draft.industryId || null,
    capability_id: draft.capabilityId || null,
    material_grade: draft.materialGrade.trim() || null,
    manufacturing_process: draft.manufacturingProcess.trim() || null,
    frequency: draft.frequency,
    moq_required: draft.moqRequired,
    delivery_state: draft.deliveryState.trim() || null,
    delivery_city: draft.deliveryCity.trim() || null,
    delivery_date: draft.deliveryDate || null,
    delivery_timeline: draft.deliveryTimeline || null,
    supplier_slug: draft.supplierSlug,
  };
}

function buildGuestDescription(draft: GuestRfqDraft) {
  const parts = [draft.description.trim()].filter(Boolean);
  if (draft.materialGrade.trim()) {
    parts.push(`Material grade: ${draft.materialGrade.trim()}`);
  }
  if (draft.manufacturingProcess.trim()) {
    parts.push(`Manufacturing process: ${draft.manufacturingProcess.trim()}`);
  }
  return parts.join("\n\n") || draft.productName.trim();
}
