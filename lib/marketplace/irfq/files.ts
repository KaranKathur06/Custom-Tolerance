import type { SupabaseClient } from "@supabase/supabase-js";
import type { IrfqReferenceData } from "./types";
import {
  inferRfqFileType,
  isBlockedUploadFilename,
  RFQ_DRAWING_ALLOWED_MIME_TYPES,
  RFQ_MAX_SINGLE_FILE_BYTES,
} from "./validation";

export async function loadIrfqReferenceData(
  supabase: SupabaseClient,
): Promise<IrfqReferenceData> {
  const [
    projectTypes,
    units,
    currencies,
    tolerances,
    surfaceFinishes,
    materials,
    materialGrades,
    incoterms,
    paymentTerms,
    paymentModes,
    shippingModes,
    turnoverRanges,
    employeeRanges,
    factorySizeRanges,
    productionCapacity,
    experienceYears,
    machineTypes,
    inspectionEquipment,
    certifications,
  ] = await Promise.all([
    supabase.from("ref_project_types").select("slug, name").order("sort_order"),
    supabase.from("ref_units").select("slug, name").order("sort_order"),
    supabase.from("ref_currencies").select("code, name, symbol, priority").order("priority"),
    supabase.from("ref_tolerances").select("slug, label").order("sort_order"),
    supabase.from("ref_surface_finishes").select("slug, name").order("sort_order"),
    supabase.from("ref_materials").select("slug, name, family").order("sort_order"),
    supabase.from("ref_material_grades").select("slug, material_slug, grade").order("sort_order"),
    supabase.from("ref_incoterms").select("slug, name").order("sort_order"),
    supabase.from("ref_payment_terms").select("slug, name").order("sort_order"),
    supabase.from("ref_payment_modes").select("slug, name").order("sort_order"),
    supabase.from("ref_shipping_modes").select("slug, name").order("sort_order"),
    supabase.from("ref_turnover_ranges").select("slug, label").order("sort_order"),
    supabase.from("ref_employee_ranges").select("slug, label").order("sort_order"),
    supabase.from("ref_factory_size_ranges").select("slug, label").order("sort_order"),
    supabase.from("ref_production_capacity").select("slug, label").order("sort_order"),
    supabase.from("ref_experience_years").select("slug, label, min_years").order("sort_order"),
    supabase.from("ref_machine_types").select("slug, name, category").order("sort_order"),
    supabase.from("ref_inspection_equipment").select("slug, name").order("sort_order"),
    supabase.from("ref_certifications").select("slug, name, category").order("sort_order"),
  ]);

  return {
    projectTypes: projectTypes.data ?? [],
    units: units.data ?? [],
    currencies: (currencies.data ?? []).map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      priority: c.priority,
    })),
    tolerances: tolerances.data ?? [],
    surfaceFinishes: surfaceFinishes.data ?? [],
    materials: materials.data ?? [],
    materialGrades: (materialGrades.data ?? []).map((g) => ({
      slug: g.slug,
      materialSlug: g.material_slug,
      grade: g.grade,
    })),
    incoterms: incoterms.data ?? [],
    paymentTerms: paymentTerms.data ?? [],
    paymentModes: paymentModes.data ?? [],
    shippingModes: shippingModes.data ?? [],
    turnoverRanges: turnoverRanges.data ?? [],
    employeeRanges: employeeRanges.data ?? [],
    factorySizeRanges: factorySizeRanges.data ?? [],
    productionCapacity: productionCapacity.data ?? [],
    experienceYears: (experienceYears.data ?? []).map((e) => ({
      slug: e.slug,
      label: e.label,
      minYears: e.min_years,
    })),
    machineTypes: machineTypes.error ? [] : (machineTypes.data ?? []),
    inspectionEquipment: inspectionEquipment.error ? [] : (inspectionEquipment.data ?? []),
    certifications: certifications.error ? [] : (certifications.data ?? []),
  };
}

export async function getRfqTotalFileBytes(supabase: SupabaseClient, rfqId: string) {
  const { data } = await supabase
    .from("rfq_files")
    .select("file_size_bytes")
    .eq("rfq_id", rfqId);

  return (data ?? []).reduce((sum, row) => sum + Number(row.file_size_bytes ?? 0), 0);
}

export type UploadRfqFileInput = {
  rfqId: string;
  userId: string;
  file: File;
  rfqItemId?: string | null;
};

export async function uploadRfqDrawingFile(
  supabase: SupabaseClient,
  input: UploadRfqFileInput,
) {
  const { file, rfqId, userId, rfqItemId } = input;

  if (isBlockedUploadFilename(file.name)) {
    throw new Error("This file type is not allowed for security reasons");
  }

  if (file.size > RFQ_MAX_SINGLE_FILE_BYTES) {
    throw new Error("Single file exceeds 500MB limit");
  }

  const existingBytes = await getRfqTotalFileBytes(supabase, rfqId);
  if (existingBytes + file.size > 5 * 1024 * 1024 * 1024) {
    throw new Error("Total RFQ file size exceeds 5GB limit");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const timestamp = Date.now();
  const safeName = `${timestamp}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${userId}/rfq/${rfqId}/${safeName}`;
  const fileType = inferRfqFileType(file.name, file.type);

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("rfq-drawings")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: signed } = await supabase.storage
    .from("rfq-drawings")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: record, error: dbError } = await supabase
    .from("rfq_files")
    .insert({
      rfq_id: rfqId,
      rfq_item_id: rfqItemId ?? null,
      file_name: file.name,
      file_url: signed?.signedUrl ?? storagePath,
      storage_path: storagePath,
      file_type: fileType,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      uploaded_by: userId,
      virus_scan_status: "pending",
      ai_processing_status: "pending",
    })
    .select("id, file_name, file_type, file_size_bytes, mime_type, virus_scan_status, created_at")
    .single();

  if (dbError) {
    await supabase.storage.from("rfq-drawings").remove([storagePath]);
    throw new Error(dbError.message);
  }

  await supabase.from("rfq_activity_log").insert({
    rfq_id: rfqId,
    actor_id: userId,
    action: "file.uploaded",
    metadata: { file_name: file.name, file_type: fileType },
  });

  return record;
}

export function isAllowedRfqDrawingMime(mimeType: string, filename: string): boolean {
  if (RFQ_DRAWING_ALLOWED_MIME_TYPES.includes(mimeType)) return true;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "dxf", "dwg", "step", "stp", "iges", "igs", "stl", "docx", "xlsx", "zip"].includes(ext);
}
