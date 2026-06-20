import type { IrfqCreationMethod, IrfqSubscriptionPlan } from "./types";

export type IrfqPlanLimits = {
  rfqsPerMonth: number | null;
  maxSupplierMatches: number | null;
  advancedFilters: boolean;
  aiAssistant: boolean;
  apiImport: boolean;
  erpIntegration: boolean;
  bomParser: boolean;
};

const PLAN_DEFAULTS: Record<IrfqSubscriptionPlan, IrfqPlanLimits> = {
  free: {
    rfqsPerMonth: 3,
    maxSupplierMatches: 5,
    advancedFilters: false,
    aiAssistant: false,
    apiImport: false,
    erpIntegration: false,
    bomParser: false,
  },
  premium: {
    rfqsPerMonth: null,
    maxSupplierMatches: null,
    advancedFilters: true,
    aiAssistant: true,
    apiImport: false,
    erpIntegration: false,
    bomParser: true,
  },
  enterprise: {
    rfqsPerMonth: null,
    maxSupplierMatches: null,
    advancedFilters: true,
    aiAssistant: true,
    apiImport: true,
    erpIntegration: true,
    bomParser: true,
  },
};

export function getIrfqPlanLimits(plan: IrfqSubscriptionPlan): IrfqPlanLimits {
  return PLAN_DEFAULTS[plan];
}

export function resolveUserIrfqPlan(
  membershipPlan?: string | null,
  trustLevel?: number,
): IrfqSubscriptionPlan {
  const normalized = (membershipPlan ?? "").toLowerCase();
  if (normalized.includes("enterprise") || normalized.includes("gold")) return "enterprise";
  if (normalized.includes("premium") || normalized.includes("silver")) return "premium";
  if ((trustLevel ?? 0) >= 3) return "premium";
  return "free";
}

export function canUseCreationMethod(
  method: IrfqCreationMethod,
  plan: IrfqSubscriptionPlan,
): { allowed: boolean; message?: string } {
  const limits = getIrfqPlanLimits(plan);

  if (["ai_quick", "conversational"].includes(method) && !limits.aiAssistant) {
    return { allowed: false, message: "Upgrade to Premium to use AI RFQ creation" };
  }
  if (method === "bom_upload" && !limits.bomParser) {
    return { allowed: false, message: "Upgrade to Premium to parse Excel BOM files" };
  }
  if (method === "api_import" && !limits.apiImport) {
    return { allowed: false, message: "API RFQ Import requires Enterprise plan" };
  }
  if (method === "erp_integration" && !limits.erpIntegration) {
    return { allowed: false, message: "ERP Integration requires Enterprise plan" };
  }

  return { allowed: true };
}

export function canUseAdvancedFilters(plan: IrfqSubscriptionPlan): boolean {
  return getIrfqPlanLimits(plan).advancedFilters;
}
