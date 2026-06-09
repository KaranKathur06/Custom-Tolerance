import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSupplierProfileDataFromDraft,
  calculateSupplierProfileCompletion,
  MANDATORY_DOCUMENT_TYPES,
} from "./supplier-profile-completion";
import type { SupplierOnboardingStatus } from "./supplier-onboarding-status";
import { calculateSupplierTrustScore } from "./supplier-trust-score";
import { ensureUniqueSlug } from "./slug";
import { syncMarketplaceSupplierFromCompany } from "./profile-migration";

export type SupplierVerificationCommitResult = {
  companyId: string;
  sellerProfileId: string;
  onboardingStatus: SupplierOnboardingStatus;
  profileCompletionPercent: number;
  trustScore: number;
  publicSlug: string | null;
};

function draftString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function draftNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function commitSupplierVerificationProfile(
  supabase: SupabaseClient,
  userId: string,
  draft: Record<string, unknown>,
  options: { submitForReview?: boolean } = {},
): Promise<SupplierVerificationCommitResult> {
  const companyName = draftString(draft, "companyName");
  if (!companyName) {
    throw new Error("Company name is required.");
  }

  const profileData = buildSupplierProfileDataFromDraft(draft);
  const completion = calculateSupplierProfileCompletion(profileData);

  if (options.submitForReview && completion.overallPercent < 100) {
    throw new Error(`Profile must be 100% complete before submission. Currently ${completion.overallPercent}%.`);
  }

  const slug = await ensureUniqueSlug(companyName, async (candidate) => {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", candidate)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  });

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id, slug, marketplace_supplier_id")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const companyPatch = {
    owner_id: userId,
    profile_id: userId,
    name: companyName,
    legal_business_name: draftString(draft, "legalBusinessName"),
    slug: existingCompany?.slug ?? slug,
    business_type: draftString(draft, "businessType"),
    company_description: draftString(draft, "companyDescription"),
    gst_number: draftString(draft, "gstNumber"),
    pan_number: draftString(draft, "panNumber"),
    website: draftString(draft, "website"),
    linkedin_url: draftString(draft, "linkedinUrl"),
    facebook_url: draftString(draft, "facebookUrl"),
    youtube_url: draftString(draft, "youtubeUrl"),
    number_of_employees: draftString(draft, "numberOfEmployees") ?? draftString(draft, "companySize"),
    year_established: draftNumber(draft, "yearEstablished"),
    country_id: draftString(draft, "countryId"),
    state_id: draftString(draft, "stateId"),
    city_id: draftString(draft, "cityId"),
    full_address: draftString(draft, "fullAddress") ?? draftString(draft, "factoryAddress"),
    factory_address: draftString(draft, "fullAddress") ?? draftString(draft, "factoryAddress"),
    pincode: draftString(draft, "pincode"),
    latitude: draftNumber(draft, "latitude"),
    longitude: draftNumber(draft, "longitude"),
    google_maps_url: draftString(draft, "googleMapsUrl"),
    email_verified: Boolean(draft.emailVerified),
    phone_verified: Boolean(draft.mobileVerified ?? draft.phoneVerified),
    verification_status: options.submitForReview ? "in_review" : "pending",
  };

  let companyId = existingCompany?.id ?? null;

  if (companyId) {
    const { error } = await supabase.from("companies").update(companyPatch).eq("id", companyId);
    if (error) throw new Error(`Failed to update company: ${error.message}`);
  } else {
    const { data: created, error } = await supabase
      .from("companies")
      .insert(companyPatch)
      .select("id, slug")
      .single();
    if (error) throw new Error(`Failed to create company: ${error.message}`);
    companyId = created.id;
  }

  const onboardingStatus: SupplierOnboardingStatus = options.submitForReview
    ? "PROFILE_SUBMITTED"
    : completion.overallPercent >= 100
      ? "PROFILE_INCOMPLETE"
      : completion.overallPercent > 0
        ? "PROFILE_INCOMPLETE"
        : "REGISTERED";

  const { data: existingSeller } = await supabase
    .from("seller_profiles")
    .select("id, onboarding_status")
    .eq("profile_id", userId)
    .maybeSingle();

  const sellerPatch = {
    profile_id: userId,
    company_id: companyId,
    profile_completion_percent: completion.overallPercent,
    onboarding_status: options.submitForReview ? "PROFILE_SUBMITTED" : onboardingStatus,
    verification_status: options.submitForReview ? "in_review" : "pending",
    review_status: options.submitForReview ? "in_review" : "pending",
    submitted_at: options.submitForReview ? new Date().toISOString() : null,
    created_by: userId,
  };

  let sellerProfileId = existingSeller?.id ?? null;

  if (sellerProfileId) {
    const { error } = await supabase.from("seller_profiles").update(sellerPatch).eq("id", sellerProfileId);
    if (error) throw new Error(`Failed to update seller profile: ${error.message}`);
  } else {
    const { data: created, error } = await supabase
      .from("seller_profiles")
      .insert(sellerPatch)
      .select("id")
      .single();
    if (error) throw new Error(`Failed to create seller profile: ${error.message}`);
    sellerProfileId = created.id;
  }

  // Persist section completion tracking
  for (const section of completion.sections) {
    const sectionDef = completion.sections.find((s) => s.key === section.key);
    await supabase.from("supplier_completion_tracking").upsert(
      {
        seller_profile_id: sellerProfileId,
        profile_id: userId,
        section_key: section.key,
        section_label: section.label,
        percent_complete: section.percent,
        missing_fields: section.missingFields,
        is_complete: section.percent === 100,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "seller_profile_id,section_key" },
    );
    void sectionDef;
  }

  // Address
  const addressPatch = {
    seller_profile_id: sellerProfileId,
    company_id: companyId,
    country_id: draftString(draft, "countryId"),
    state_id: draftString(draft, "stateId"),
    city_id: draftString(draft, "cityId"),
    full_address: draftString(draft, "fullAddress"),
    pincode: draftString(draft, "pincode"),
    latitude: draftNumber(draft, "latitude"),
    longitude: draftNumber(draft, "longitude"),
    google_maps_url: draftString(draft, "googleMapsUrl"),
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data: existingAddress } = await supabase
    .from("supplier_addresses")
    .select("id")
    .eq("seller_profile_id", sellerProfileId)
    .maybeSingle();

  if (existingAddress?.id) {
    await supabase.from("supplier_addresses").update(addressPatch).eq("id", existingAddress.id);
  } else {
    await supabase.from("supplier_addresses").insert(addressPatch);
  }

  // Capabilities — replace existing
  await supabase.from("supplier_capabilities").delete().eq("seller_profile_id", sellerProfileId);
  const capabilities = Array.isArray(draft.capabilities) ? draft.capabilities : [];
  for (const cap of capabilities) {
    if (typeof cap !== "object" || cap === null) continue;
    const c = cap as Record<string, unknown>;
    await supabase.from("supplier_capabilities").insert({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      process_name: String(c.processName ?? c.process_name ?? ""),
      materials_supported: Array.isArray(c.materialsSupported) ? c.materialsSupported : [],
      monthly_capacity: draftString(c, "monthlyCapacity"),
      machine_count: draftNumber(c, "machineCount"),
      tolerance_capability: draftString(c, "toleranceCapability"),
      max_part_size: draftString(c, "maxPartSize"),
      min_part_size: draftString(c, "minPartSize"),
      created_by: userId,
    });
  }

  // Factory details
  await supabase.from("supplier_factory_details").upsert(
    {
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      factory_area_sqft: draftNumber(draft, "factoryArea"),
      production_area_sqft: draftNumber(draft, "productionArea"),
      warehouse_area_sqft: draftNumber(draft, "warehouseArea"),
      number_of_machines: draftNumber(draft, "numberOfMachines"),
      quality_certifications: Array.isArray(draft.qualityCertifications)
        ? draft.qualityCertifications
        : [],
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "seller_profile_id" },
  );

  // Documents
  const documents = Array.isArray(draft.documents) ? draft.documents : [];
  for (const doc of documents) {
    if (typeof doc !== "object" || doc === null) continue;
    const d = doc as Record<string, unknown>;
    const docType = String(d.documentType ?? "");
    const fileUrl = String(d.fileUrl ?? "");
    if (!docType || !fileUrl) continue;

    await supabase.from("supplier_documents").insert({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      profile_id: userId,
      document_type: docType,
      file_url: fileUrl,
      storage_path: draftString(d, "storagePath"),
      is_mandatory: MANDATORY_DOCUMENT_TYPES.includes(docType as (typeof MANDATORY_DOCUMENT_TYPES)[number]),
      verification_status: "pending",
      created_by: userId,
    });
  }

  // Factory media
  const factoryPhotos = Array.isArray(draft.factoryPhotos) ? draft.factoryPhotos : [];
  await supabase
    .from("supplier_media")
    .delete()
    .eq("seller_profile_id", sellerProfileId)
    .eq("media_type", "image");
  for (const [index, photo] of factoryPhotos.entries()) {
    if (typeof photo !== "object" || photo === null) continue;
    const p = photo as Record<string, unknown>;
    const fileUrl = String(p.fileUrl ?? "");
    if (!fileUrl) continue;
    await supabase.from("supplier_media").insert({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      media_type: "image",
      category: String(p.category ?? "shop_floor"),
      file_url: fileUrl,
      sort_order: index * 10,
      created_by: userId,
    });
  }

  // Trust score
  const trustBreakdown = calculateSupplierTrustScore({
    profileCompletionPercent: completion.overallPercent,
    documentsUploaded: documents.length,
    documentsRequired: MANDATORY_DOCUMENT_TYPES.length,
    documentsApproved: 0,
    emailVerified: Boolean(draft.emailVerified),
    mobileVerified: Boolean(draft.mobileVerified ?? draft.phoneVerified),
    factoryPhotoCount: factoryPhotos.length,
    certificationCount: Array.isArray(draft.qualityCertifications)
      ? draft.qualityCertifications.length
      : 0,
    adminApproved: false,
  });

  await supabase.from("supplier_trust_scores").upsert(
    {
      seller_profile_id: sellerProfileId,
      profile_completion_score: trustBreakdown.profileCompletionScore,
      documents_score: trustBreakdown.documentsScore,
      verification_score: trustBreakdown.verificationScore,
      factory_photos_score: trustBreakdown.factoryPhotosScore,
      certifications_score: trustBreakdown.certificationsScore,
      response_rate_score: trustBreakdown.responseRateScore,
      rfq_success_score: trustBreakdown.rfqSuccessScore,
      trust_score: trustBreakdown.trustScore,
      total_score: trustBreakdown.trustScore,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "seller_profile_id" },
  );

  if (options.submitForReview) {
    await supabase.from("supplier_review_logs").insert({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      actor_id: userId,
      action: "profile_submitted",
      previous_status: existingSeller?.onboarding_status ?? "REGISTERED",
      new_status: "PROFILE_SUBMITTED",
      notes: "Supplier submitted profile for admin verification",
      created_by: userId,
    });

    await supabase
      .from("seller_profiles")
      .update({ onboarding_status: "UNDER_REVIEW" })
      .eq("id", sellerProfileId);
  }

  await supabase
    .from("profiles")
    .update({
      profile_status: completion.overallPercent >= 100 ? "complete" : "in_progress",
      verification_status: options.submitForReview ? "in_review" : "pending",
    })
    .eq("id", userId);

  await syncMarketplaceSupplierFromCompany(supabase, companyId);

  const { data: syncedCompany } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .maybeSingle();

  return {
    companyId,
    sellerProfileId,
    onboardingStatus: options.submitForReview ? "UNDER_REVIEW" : onboardingStatus,
    profileCompletionPercent: completion.overallPercent,
    trustScore: trustBreakdown.trustScore,
    publicSlug: syncedCompany?.slug ?? existingCompany?.slug ?? slug,
  };
}
