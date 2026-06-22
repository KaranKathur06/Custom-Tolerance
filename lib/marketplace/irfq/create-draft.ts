import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUniqueSlug } from "../slug";
import type { IrfqCreationMethod, IrfqDraftPayload, IrfqSubscriptionPlan } from "./types";
import { getIrfqPlanLimits } from "./subscription-gates";

export type CreateIrfqDraftInput = {
  buyerProfileId: string;
  buyerUserId: string;
  companyId?: string | null;
  creationMethod?: IrfqCreationMethod;
  subscriptionPlan?: IrfqSubscriptionPlan;
  payload?: IrfqDraftPayload;
};

function buildTitle(payload: IrfqDraftPayload): string {
  return (
    payload.rfqTitle?.trim() ||
    payload.title?.trim() ||
    payload.projectName?.trim() ||
    "Untitled RFQ"
  );
}

export async function createIrfqDraft(supabase: SupabaseClient, input: CreateIrfqDraftInput) {
  const payload = input.payload ?? {};
  const title = buildTitle(payload);
  const plan = input.subscriptionPlan ?? "free";
  const limits = getIrfqPlanLimits(plan);

  const slug = await ensureUniqueSlug(title, async (candidate) => {
    const { data } = await supabase.from("rfqs").select("id").eq("slug", candidate).maybeSingle();
    return Boolean(data);
  });

  const { data, error } = await supabase
    .from("rfqs")
    .insert({
      buyer_profile_id: input.buyerProfileId,
      buyer_user_id: input.buyerUserId,
      company_id: input.companyId ?? null,
      title,
      rfq_title: payload.rfqTitle?.trim() || title,
      project_name: payload.projectName?.trim() || null,
      slug,
      description: payload.description?.trim() || title,
      status: "draft",
      visibility_level: "standard",
      creation_method: input.creationMethod ?? "manual",
      privacy_level: payload.privacyLevel ?? "public",
      composer_step: payload.composerStep ?? 0,
      composer_data: payload.composerData ?? {},
      project_type: payload.projectType ?? null,
      currency_code: payload.currencyCode ?? "USD",
      target_price: payload.targetPrice ?? null,
      buyer_country: payload.buyerCountry ?? "IN",
      buyer_state: payload.buyerState ?? null,
      buyer_city: payload.buyerCity ?? null,
      delivery_state: payload.deliveryState ?? null,
      delivery_city: payload.deliveryCity ?? null,
      delivery_postal_code: payload.deliveryPostalCode ?? null,
      delivery_mode: payload.deliveryMode ?? null,
      shipping_preferences: payload.shippingPreferences ?? [],
      payment_terms: payload.paymentTerms ?? null,
      payment_mode: payload.paymentMode ?? null,
      quotation_deadline: payload.quotationDeadline ?? null,
      manufacturing_lead_time_days: payload.manufacturingLeadTimeDays ?? null,
      expected_delivery_date: payload.expectedDeliveryDate ?? null,
      supplier_location_pref: payload.supplierLocationPref ?? {},
      supplier_requirements: payload.supplierRequirements ?? {},
      advanced_supplier_filters: payload.advancedSupplierFilters ?? {},
      capability_matrix_filters: payload.capabilityMatrixFilters ?? {},
      subscription_plan_at_create: plan,
      max_supplier_matches: limits.maxSupplierMatches ?? 5,
      country: payload.buyerCountry === "IN" ? "India" : payload.buyerCountry ?? "India",
      state: payload.deliveryState ?? payload.buyerState ?? null,
      city: payload.deliveryCity ?? payload.buyerCity ?? null,
      created_by_real_user: true,
      is_seeded: false,
    })
    .select("id, title, slug, status, creation_method, composer_step, created_at")
    .single();

  if (error) throw new Error(error.message);

  if (payload.industryId) {
    await supabase.from("rfq_industries").insert({
      rfq_id: data.id,
      industry_id: payload.industryId,
    });
  }

  for (const capabilityId of payload.capabilityIds ?? []) {
    if (!capabilityId) continue;
    await supabase.from("rfq_capabilities").insert({
      rfq_id: data.id,
      capability_id: capabilityId,
    });
  }

  await supabase.from("rfq_activity_log").insert({
    rfq_id: data.id,
    actor_id: input.buyerUserId,
    action: "draft.created",
    metadata: { creation_method: input.creationMethod ?? "manual" },
  });

  await supabase.from("platform_events").insert({
    event_type: "irfq.draft.created",
    actor_id: input.buyerUserId,
    resource_type: "rfq",
    resource_id: data.id,
    metadata: { slug: data.slug },
  });

  return data;
}

export async function updateIrfqDraft(
  supabase: SupabaseClient,
  rfqId: string,
  userId: string,
  payload: IrfqDraftPayload,
) {
  const title = buildTitle(payload);

  const updatePayload: Record<string, unknown> = {
    title,
    rfq_title: payload.rfqTitle?.trim() || title,
    project_name: payload.projectName?.trim() || null,
    description: payload.description?.trim() || title,
    project_type: payload.projectType ?? null,
    composer_step: payload.composerStep ?? 0,
    composer_data: payload.composerData ?? {},
    currency_code: payload.currencyCode ?? "USD",
    target_price: payload.targetPrice ?? null,
    buyer_country: payload.buyerCountry ?? "IN",
    buyer_state: payload.buyerState ?? null,
    buyer_city: payload.buyerCity ?? null,
    delivery_state: payload.deliveryState ?? null,
    delivery_city: payload.deliveryCity ?? null,
    delivery_postal_code: payload.deliveryPostalCode ?? null,
    delivery_mode: payload.deliveryMode ?? null,
    shipping_preferences: payload.shippingPreferences ?? [],
    payment_terms: payload.paymentTerms ?? null,
    payment_mode: payload.paymentMode ?? null,
    quotation_deadline: payload.quotationDeadline ?? null,
    manufacturing_lead_time_days: payload.manufacturingLeadTimeDays ?? null,
    expected_delivery_date: payload.expectedDeliveryDate ?? null,
    supplier_location_pref: payload.supplierLocationPref ?? {},
    supplier_requirements: payload.supplierRequirements ?? {},
      advanced_supplier_filters: payload.advancedSupplierFilters ?? {},
      capability_matrix_filters: payload.capabilityMatrixFilters ?? {},
      privacy_level: payload.privacyLevel ?? "public",
    state: payload.deliveryState ?? payload.buyerState ?? null,
    city: payload.deliveryCity ?? payload.buyerCity ?? null,
  };

  const { data, error } = await supabase
    .from("rfqs")
    .update(updatePayload)
    .eq("id", rfqId)
    .eq("status", "draft")
    .select("id, title, slug, status, composer_step, updated_at")
    .single();

  if (error) throw new Error(error.message);

  if (payload.industryId) {
    await supabase.from("rfq_industries").delete().eq("rfq_id", rfqId);
    await supabase.from("rfq_industries").insert({
      rfq_id: rfqId,
      industry_id: payload.industryId,
    });
  }

  if (payload.capabilityIds) {
    await supabase.from("rfq_capabilities").delete().eq("rfq_id", rfqId);
    for (const capabilityId of payload.capabilityIds) {
      if (!capabilityId) continue;
      await supabase.from("rfq_capabilities").insert({
        rfq_id: rfqId,
        capability_id: capabilityId,
      });
    }
  }

  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    actor_id: userId,
    action: "draft.updated",
    metadata: { composer_step: payload.composerStep ?? 0 },
  });

  return data;
}
