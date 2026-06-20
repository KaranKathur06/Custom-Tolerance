import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrfqItemInput } from "./types";

export async function listRfqItems(supabase: SupabaseClient, rfqId: string) {
  const { data, error } = await supabase
    .from("rfq_items")
    .select(
      `
      id, line_number, item_name, part_number, part_revision, drawing_number,
      description, quantity, unit, annual_requirement, moq, target_price,
      currency_code, tolerance, tolerance_custom, surface_finish, surface_finish_custom,
      heat_treatment, sort_order, ai_extracted, ai_confidence,
      rfq_item_materials(id, material_slug, material_name, material_grade, is_custom_grade)
    `,
    )
    .eq("rfq_id", rfqId)
    .order("line_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getNextLineNumber(supabase: SupabaseClient, rfqId: string) {
  const { data } = await supabase
    .from("rfq_items")
    .select("line_number")
    .eq("rfq_id", rfqId)
    .order("line_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.line_number ?? 0) + 1;
}

export async function createRfqItem(
  supabase: SupabaseClient,
  rfqId: string,
  input: IrfqItemInput,
) {
  const lineNumber = await getNextLineNumber(supabase, rfqId);

  const { data: item, error } = await supabase
    .from("rfq_items")
    .insert({
      rfq_id: rfqId,
      line_number: lineNumber,
      item_name: input.itemName.trim(),
      part_number: input.partNumber ?? null,
      part_revision: input.partRevision ?? null,
      drawing_number: input.drawingNumber ?? null,
      description: input.description ?? null,
      quantity: input.quantity,
      unit: input.unit,
      annual_requirement: input.annualRequirement ?? null,
      moq: input.moq ?? null,
      target_price: input.targetPrice ?? null,
      currency_code: input.currencyCode ?? null,
      tolerance: input.tolerance ?? null,
      tolerance_custom: input.toleranceCustom ?? null,
      surface_finish: input.surfaceFinish ?? [],
      surface_finish_custom: input.surfaceFinishCustom ?? null,
      heat_treatment: input.heatTreatment ?? null,
      sort_order: lineNumber,
    })
    .select("id, line_number, item_name, quantity, unit")
    .single();

  if (error) throw new Error(error.message);

  for (const material of input.materials ?? []) {
    await supabase.from("rfq_item_materials").insert({
      rfq_item_id: item.id,
      material_slug: material.materialSlug ?? null,
      material_name: material.materialName,
      material_grade: material.materialGrade ?? null,
      is_custom_grade: material.isCustomGrade ?? false,
    });
  }

  for (const capabilityId of input.capabilityIds ?? []) {
    if (!capabilityId) continue;
    await supabase.from("rfq_item_capabilities").insert({
      rfq_item_id: item.id,
      capability_id: capabilityId,
    });
  }

  return item;
}

export async function updateRfqItem(
  supabase: SupabaseClient,
  rfqId: string,
  itemId: string,
  input: Partial<IrfqItemInput>,
) {
  const patch: Record<string, unknown> = {};
  if (input.itemName !== undefined) patch.item_name = input.itemName.trim();
  if (input.partNumber !== undefined) patch.part_number = input.partNumber;
  if (input.partRevision !== undefined) patch.part_revision = input.partRevision;
  if (input.drawingNumber !== undefined) patch.drawing_number = input.drawingNumber;
  if (input.description !== undefined) patch.description = input.description;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.annualRequirement !== undefined) patch.annual_requirement = input.annualRequirement;
  if (input.moq !== undefined) patch.moq = input.moq;
  if (input.targetPrice !== undefined) patch.target_price = input.targetPrice;
  if (input.currencyCode !== undefined) patch.currency_code = input.currencyCode;
  if (input.tolerance !== undefined) patch.tolerance = input.tolerance;
  if (input.toleranceCustom !== undefined) patch.tolerance_custom = input.toleranceCustom;
  if (input.surfaceFinish !== undefined) patch.surface_finish = input.surfaceFinish;
  if (input.surfaceFinishCustom !== undefined) patch.surface_finish_custom = input.surfaceFinishCustom;
  if (input.heatTreatment !== undefined) patch.heat_treatment = input.heatTreatment;

  const { data, error } = await supabase
    .from("rfq_items")
    .update(patch)
    .eq("id", itemId)
    .eq("rfq_id", rfqId)
    .select("id, line_number, item_name, quantity, unit")
    .single();

  if (error) throw new Error(error.message);

  if (input.materials) {
    await supabase.from("rfq_item_materials").delete().eq("rfq_item_id", itemId);
    for (const material of input.materials) {
      await supabase.from("rfq_item_materials").insert({
        rfq_item_id: itemId,
        material_slug: material.materialSlug ?? null,
        material_name: material.materialName,
        material_grade: material.materialGrade ?? null,
        is_custom_grade: material.isCustomGrade ?? false,
      });
    }
  }

  return data;
}

export async function deleteRfqItem(supabase: SupabaseClient, rfqId: string, itemId: string) {
  const { error } = await supabase.from("rfq_items").delete().eq("id", itemId).eq("rfq_id", rfqId);
  if (error) throw new Error(error.message);
}

export async function countRfqItems(supabase: SupabaseClient, rfqId: string) {
  const { count, error } = await supabase
    .from("rfq_items")
    .select("id", { count: "exact", head: true })
    .eq("rfq_id", rfqId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
