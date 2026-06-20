import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrfqDraftPayload } from "./types";
import { countRfqItems } from "./items";
import { validatePublishRequirements } from "./validation";
import type { IrfqSubscriptionPlan } from "./types";
import { getIrfqPlanLimits } from "./subscription-gates";

export async function incrementRfqUsage(
  supabase: SupabaseClient,
  userId: string,
) {
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodKey = periodStart.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("irfq_usage_counters")
    .select("rfqs_created")
    .eq("user_id", userId)
    .eq("period_start", periodKey)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("irfq_usage_counters")
      .update({ rfqs_created: (existing.rfqs_created ?? 0) + 1 })
      .eq("user_id", userId)
      .eq("period_start", periodKey);
  } else {
    await supabase.from("irfq_usage_counters").insert({
      user_id: userId,
      period_start: periodKey,
      rfqs_created: 1,
    });
  }
}

export async function publishIrfqDraft(
  supabase: SupabaseClient,
  rfqId: string,
  userId: string,
  payload: IrfqDraftPayload,
  plan: IrfqSubscriptionPlan,
) {
  const itemCount = await countRfqItems(supabase, rfqId);
  const validationError = validatePublishRequirements(payload, itemCount);
  if (validationError) {
    throw new Error(validationError);
  }

  const limits = getIrfqPlanLimits(plan);
  const { data: usage } = await supabase
    .from("irfq_usage_counters")
    .select("rfqs_created")
    .eq("user_id", userId)
    .eq("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
    .maybeSingle();

  if (limits.rfqsPerMonth != null && (usage?.rfqs_created ?? 0) >= limits.rfqsPerMonth) {
    throw new Error("Monthly RFQ limit reached. Upgrade to Premium for unlimited RFQs.");
  }

  const { data, error } = await supabase
    .from("rfqs")
    .update({
      status: "open",
      published_at: new Date().toISOString(),
      max_supplier_matches: limits.maxSupplierMatches ?? 5,
    })
    .eq("id", rfqId)
    .eq("status", "draft")
    .select("id, title, slug, status, published_at")
    .single();

  if (error) throw new Error(error.message);

  await incrementRfqUsage(supabase, userId);

  const { data: matches, error: matchError } = await supabase.rpc("match_suppliers_to_rfq", {
    target_rfq_id: rfqId,
    max_results: limits.maxSupplierMatches ?? 20,
    min_score: 40,
  });

  if (!matchError && matches?.length) {
    for (const [index, match] of matches.entries()) {
      await supabase.from("rfq_supplier_matches").upsert(
        {
          rfq_id: rfqId,
          supplier_id: match.supplier_id,
          match_score: match.match_score,
          match_strength: match.match_strength,
          score_breakdown: match.score_breakdown,
          explanation: match.explanation,
          rank: index + 1,
        },
        { onConflict: "rfq_id,supplier_id" },
      );
    }
  }

  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    actor_id: userId,
    action: "rfq.published",
    metadata: { match_count: matches?.length ?? 0 },
  });

  await supabase.from("platform_events").insert({
    event_type: "irfq.published",
    actor_id: userId,
    resource_type: "rfq",
    resource_id: rfqId,
    metadata: { slug: data.slug, matches: matches?.length ?? 0 },
  });

  return { rfq: data, matches: matches ?? [] };
}
