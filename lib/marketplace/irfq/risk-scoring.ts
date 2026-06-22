import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrfqDraftPayload } from "./types";
import { toleranceSlugToMm } from "./subscription-service";

export type IrfqRiskFactor = {
  code: string;
  severity: "low" | "medium" | "high";
  message: string;
  suggestion?: string;
};

export type IrfqRiskAssessment = {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  factors: IrfqRiskFactor[];
  supplierPoolSize: number;
  suggestions: string[];
};

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 8,
  medium: 15,
  high: 25,
};

function deriveRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

export async function estimateSupplierPoolSize(
  supabase: SupabaseClient,
  rfqId: string | null,
  payload: IrfqDraftPayload,
): Promise<number> {
  if (rfqId) {
    const { count } = await supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true);
    const base = count ?? 0;
    const capabilityCount = payload.capabilityIds?.length ?? 0;
    const advancedFilterCount = Object.values(payload.advancedSupplierFilters ?? {}).filter(Boolean).length;
    const matrixCount = Object.keys(payload.capabilityMatrixFilters ?? {}).length;
    const penalty = capabilityCount * 3 + advancedFilterCount * 5 + matrixCount * 4;
    return Math.max(0, base - penalty);
  }
  return 10;
}

export async function computeRfqRiskAssessment(
  supabase: SupabaseClient,
  rfqId: string | null,
  payload: IrfqDraftPayload,
  itemTolerances: string[] = [],
): Promise<IrfqRiskAssessment> {
  const factors: IrfqRiskFactor[] = [];
  const suggestions: string[] = [];

  const tightTolerances = itemTolerances
    .map(toleranceSlugToMm)
    .filter((v): v is number => v != null && v <= 0.05);

  if (tightTolerances.length > 0) {
    factors.push({
      code: "tight_tolerance",
      severity: "high",
      message: `Tolerance as tight as ±${Math.min(...tightTolerances)} mm limits the supplier pool`,
      suggestion: "Relax tolerance to ±0.1 mm to expand matching options",
    });
    suggestions.push("Relax tolerance to ±0.1 mm (+40% estimated supplier pool)");
  }

  if (payload.expectedDeliveryDate && payload.quotationDeadline) {
    const delivery = new Date(payload.expectedDeliveryDate);
    const deadline = new Date(payload.quotationDeadline);
    const leadDays = (delivery.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24);
    if (leadDays < 14) {
      factors.push({
        code: "short_lead_time",
        severity: "high",
        message: "Manufacturing lead time appears very short after quote deadline",
        suggestion: "Extend expected delivery date by 2–4 weeks",
      });
      suggestions.push("Extend expected delivery date by 2–4 weeks");
    }
  }

  if (payload.quotationDeadline) {
    const deadline = new Date(payload.quotationDeadline);
    const daysUntil = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 7) {
      factors.push({
        code: "short_quote_deadline",
        severity: "medium",
        message: "Quotation deadline is under 7 days — suppliers may not respond in time",
        suggestion: "Allow at least 7–14 days for quotations",
      });
    }
  }

  if (payload.targetPrice != null && payload.targetPrice > 0 && payload.targetPrice < 100) {
    factors.push({
      code: "low_budget",
      severity: "medium",
      message: "Target price may be below typical market rates for precision manufacturing",
      suggestion: "Review budget against recent quotes for similar parts",
    });
    suggestions.push("Increase budget toward market median for better response rate");
  }

  const advancedFilterCount =
    Object.values(payload.advancedSupplierFilters ?? {}).filter(Boolean).length +
    Object.keys(payload.capabilityMatrixFilters ?? {}).length;

  if (advancedFilterCount >= 4) {
    factors.push({
      code: "over_constrained",
      severity: "medium",
      message: "Many advanced filters active — this reduces eligible suppliers",
      suggestion: "Remove non-critical certification or turnover filters",
    });
    suggestions.push("Relax non-critical certification requirements");
  }

  const supplierPoolSize = await estimateSupplierPoolSize(supabase, rfqId, payload);

  if (supplierPoolSize < 3) {
    factors.push({
      code: "limited_pool",
      severity: "high",
      message: "Very few suppliers likely match these requirements",
      suggestion: "Enable global suppliers or reduce capability matrix filters",
    });
    suggestions.push("Expand supplier region to global suppliers");
  } else if (supplierPoolSize < 8) {
    factors.push({
      code: "narrow_pool",
      severity: "medium",
      message: "Limited supplier pool for these requirements",
      suggestion: "Consider relaxing one filter to improve match quality",
    });
  }

  const penalty = factors.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] ?? 10), 0);
  const riskScore = Math.max(0, Math.min(100, 100 - penalty));
  const riskLevel = deriveRiskLevel(riskScore);

  return {
    riskLevel,
    riskScore,
    factors,
    supplierPoolSize,
    suggestions: [...new Set(suggestions)],
  };
}

export async function persistRfqRiskAssessment(
  supabase: SupabaseClient,
  rfqId: string,
  assessment: IrfqRiskAssessment,
) {
  await supabase.from("rfqs").update({
    risk_level: assessment.riskLevel,
    risk_score: assessment.riskScore,
    risk_factors: assessment.factors,
    quote_probability_score: assessment.riskScore,
  }).eq("id", rfqId);

  await supabase.from("rfq_risk_assessments").insert({
    rfq_id: rfqId,
    risk_level: assessment.riskLevel,
    risk_score: assessment.riskScore,
    factors: assessment.factors,
    supplier_pool_size: assessment.supplierPoolSize,
    suggestions: assessment.suggestions,
  });
}
