import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrfqDraftPayload, IrfqSubscriptionPlan } from "./types";
import {
  getIrfqPlanLimits,
  resolveUserIrfqPlan,
  type IrfqPlanLimits,
} from "./subscription-gates";

export type IrfqSubscriptionUsage = {
  rfqsCreated: number;
  aiAssistantUses: number;
  bomParses: number;
  apiImports: number;
  drawingAiParses: number;
  matchReruns: number;
};

export type IrfqSubscriptionSnapshot = {
  plan: IrfqSubscriptionPlan;
  limits: IrfqPlanLimits;
  usage: IrfqSubscriptionUsage;
  periodStart: string;
  features: {
    advancedFilters: boolean;
    capabilityMatrix: boolean;
    aiAssistant: boolean;
    bomParser: boolean;
    apiImport: boolean;
    erpIntegration: boolean;
    collaboration: boolean;
  };
};

function currentPeriodStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function loadIrfqSubscriptionSnapshot(
  supabase: SupabaseClient,
  userId: string,
  trustLevel?: number,
): Promise<IrfqSubscriptionSnapshot> {
  const periodStart = currentPeriodStart();

  const [{ data: membership }, { data: irfqSub }, { data: usage }] = await Promise.all([
    supabase
      .from("memberships")
      .select("plan, status")
      .eq("user_id", userId)
      .in("status", ["active", "ACTIVE"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("irfq_subscriptions")
      .select("plan_slug, status, current_period_end")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("irfq_usage_counters")
      .select(
        "rfqs_created, ai_assistant_uses, bom_parses, api_imports, drawing_ai_parses, match_reruns",
      )
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .maybeSingle(),
  ]);

  let plan = resolveUserIrfqPlan(membership?.plan, trustLevel);

  if (irfqSub?.plan_slug) {
    plan = irfqSub.plan_slug as IrfqSubscriptionPlan;
  }

  const limits = getIrfqPlanLimits(plan);

  return {
    plan,
    limits,
    usage: {
      rfqsCreated: usage?.rfqs_created ?? 0,
      aiAssistantUses: usage?.ai_assistant_uses ?? 0,
      bomParses: usage?.bom_parses ?? 0,
      apiImports: usage?.api_imports ?? 0,
      drawingAiParses: usage?.drawing_ai_parses ?? 0,
      matchReruns: usage?.match_reruns ?? 0,
    },
    periodStart,
    features: {
      advancedFilters: limits.advancedFilters,
      capabilityMatrix: limits.advancedFilters,
      aiAssistant: limits.aiAssistant,
      bomParser: limits.bomParser,
      apiImport: limits.apiImport,
      erpIntegration: limits.erpIntegration,
      collaboration: plan === "enterprise",
    },
  };
}

export function mapPlanIdToMembershipPlan(planId: string | null | undefined): string {
  const normalized = (planId ?? "").toLowerCase();
  if (normalized.includes("enterprise") || normalized.includes("gold")) return "enterprise";
  if (normalized.includes("premium") || normalized.includes("silver")) return "premium";
  return "premium";
}

export async function activateIrfqSubscription(
  supabase: SupabaseClient,
  userId: string,
  planId: string | null | undefined,
  razorpayPaymentId?: string | null,
) {
  const planSlug = mapPlanIdToMembershipPlan(planId) as IrfqSubscriptionPlan;
  const membershipPlan = planSlug;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  await supabase.from("memberships").insert({
    user_id: userId,
    plan: membershipPlan,
    status: "active",
    start_date: now.toISOString(),
    end_date: periodEnd.toISOString(),
  });

  await supabase.from("irfq_subscriptions").insert({
    user_id: userId,
    plan_slug: planSlug,
    status: "active",
    razorpay_subscription_id: razorpayPaymentId ?? null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  });

  return { planSlug, membershipPlan };
}

export type CapabilityMatrixFilters = {
  requiredMachines?: string[];
  maxPartLengthMm?: number | null;
  maxPartWidthMm?: number | null;
  maxPartHeightMm?: number | null;
  minToleranceMm?: number | null;
  minDailyCapacity?: number | null;
  minMonthlyCapacity?: number | null;
  requiredInspection?: string[];
};

const TOLERANCE_MM: Record<string, number> = {
  pm5mm: 5,
  pm1mm: 1,
  pm0_5mm: 0.5,
  pm0_1mm: 0.1,
  pm0_05mm: 0.05,
  pm0_01mm: 0.01,
};

export function extractCapabilityRequirements(
  payload: IrfqDraftPayload,
): CapabilityMatrixFilters | null {
  const filters = payload.capabilityMatrixFilters as CapabilityMatrixFilters | undefined;
  if (!filters || Object.keys(filters).length === 0) return null;
  return filters;
}

export function toleranceSlugToMm(slug: string | null | undefined): number | null {
  if (!slug || slug === "custom") return null;
  return TOLERANCE_MM[slug] ?? null;
}

export async function upsertRfqCapabilityRequirements(
  supabase: SupabaseClient,
  rfqId: string,
  payload: IrfqDraftPayload,
  itemTolerances: string[],
) {
  const filters = extractCapabilityRequirements(payload);
  if (!filters) return;

  const minToleranceFromItems = itemTolerances
    .map(toleranceSlugToMm)
    .filter((v): v is number => v != null);
  const minToleranceMm =
    filters.minToleranceMm ??
    (minToleranceFromItems.length ? Math.min(...minToleranceFromItems) : null);

  await supabase.from("rfq_capability_requirements").upsert(
    {
      rfq_id: rfqId,
      required_machines: filters.requiredMachines ?? [],
      max_part_length_mm: filters.maxPartLengthMm ?? null,
      max_part_width_mm: filters.maxPartWidthMm ?? null,
      max_part_height_mm: filters.maxPartHeightMm ?? null,
      min_tolerance_mm: minToleranceMm,
      min_daily_capacity: filters.minDailyCapacity ?? null,
      min_monthly_capacity: filters.minMonthlyCapacity ?? null,
      required_inspection: filters.requiredInspection ?? [],
    },
    { onConflict: "rfq_id" },
  );
}
