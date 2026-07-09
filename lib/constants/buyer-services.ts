export type BuyerServiceOption = {
  id: string;
  label: string;
};

export const BUYER_SERVICES_OPTIONS: readonly BuyerServiceOption[] = [
  {
    id: "UNBRANDED_NO_BRAND",
    label: "Unbranded (No Brand)",
  },
  {
    id: "CONTRACT_MANUFACTURING",
    label: "Contract Manufacturing",
  },
  {
    id: "PRIVATE_LABEL",
    label: "Buyer's Brand / Private Label",
  },
  {
    id: "OEM",
    label: "OEM (Original Equipment Manufacturing)",
  },
  {
    id: "CUSTOM_PRODUCT_DEVELOPMENT",
    label: "Custom Product Development",
  },
  {
    id: "PROTOTYPE_SAMPLE_DEVELOPMENT",
    label: "Prototype / Sample Development",
  },
  {
    id: "JOB_WORK_SERVICES",
    label: "Job Work Services",
  },
  {
    id: "FINAL_FINISHED_READY_TO_MARKET",
    label: "Final Finished / Ready-to-Market Product",
  },
] as const;

const BUYER_SERVICE_ID_SET = new Set(BUYER_SERVICES_OPTIONS.map((option) => option.id));

const BUYER_SERVICE_ALIASES: Record<string, string> = {
  "unbranded (no brand)": "UNBRANDED_NO_BRAND",
  unbranded: "UNBRANDED_NO_BRAND",
  "contract manufacturing": "CONTRACT_MANUFACTURING",
  "buyer's brand / private label": "PRIVATE_LABEL",
  "buyer’s brand / private label": "PRIVATE_LABEL",
  "private label": "PRIVATE_LABEL",
  "white label": "PRIVATE_LABEL",
  oem: "OEM",
  "original equipment manufacturing": "OEM",
  "custom product development": "CUSTOM_PRODUCT_DEVELOPMENT",
  "prototype / sample development": "PROTOTYPE_SAMPLE_DEVELOPMENT",
  prototype: "PROTOTYPE_SAMPLE_DEVELOPMENT",
  "sample development": "PROTOTYPE_SAMPLE_DEVELOPMENT",
  "job work services": "JOB_WORK_SERVICES",
  "job work": "JOB_WORK_SERVICES",
  "final finished / ready-to-market product": "FINAL_FINISHED_READY_TO_MARKET",
  "final finished products": "FINAL_FINISHED_READY_TO_MARKET",
  "final finished product": "FINAL_FINISHED_READY_TO_MARKET",
  "ready-to-market": "FINAL_FINISHED_READY_TO_MARKET",
};

export function normalizeBuyerServiceValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const upperSnake = trimmed.toUpperCase();
  if (BUYER_SERVICE_ID_SET.has(upperSnake)) {
    return upperSnake;
  }

  const alias = BUYER_SERVICE_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  const normalizedLabel = trimmed.toLowerCase();
  const matchedAlias = Object.entries(BUYER_SERVICE_ALIASES).find(
    ([key]) => key === normalizedLabel,
  );

  if (matchedAlias) {
    return matchedAlias[1];
  }

  return null;
}

export function normalizeBuyerServices(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const nextValue = normalizeBuyerServiceValue(item);
    if (!nextValue || seen.has(nextValue)) {
      continue;
    }

    seen.add(nextValue);
    normalized.push(nextValue);
  }

  return normalized;
}

export function isApprovedBuyerService(value: unknown): boolean {
  return normalizeBuyerServiceValue(value) !== null;
}

export function getBuyerServiceOption(id: string): BuyerServiceOption | undefined {
  return BUYER_SERVICES_OPTIONS.find((option) => option.id === id);
}
