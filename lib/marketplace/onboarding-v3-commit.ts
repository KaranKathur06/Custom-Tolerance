import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { commitBuyerOnboarding } from "./onboarding-commit-buyer";
import { commitSupplierVerificationProfile } from "./supplier-verification-commit";
import {
  calculateBuyerOnboardingV3Completion,
  calculateSellerOnboardingV3Completion,
  getSellerV3HardGateStatus,
} from "./onboarding-v3";

export type BuyerOnboardingV3CommitResult = {
  buyerProfileId: string;
  companyId: string | null;
  completionPercent: number;
};

export type SellerOnboardingV3CommitResult = {
  sellerProfileId: string;
  companyId: string;
  completionPercent: number;
  canActivate: boolean;
  missingActivationRequirements: string[];
};

function draftString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function draftStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function draftBool(payload: Record<string, unknown>, key: string): boolean {
  return Boolean(payload[key]);
}

function accountFingerprint(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value.trim()).digest("hex");
}

function accountLast4(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4) || null;
}

async function replaceRows(
  supabase: SupabaseClient,
  tableName: string,
  foreignKey: string,
  foreignId: string,
  rows: Record<string, unknown>[],
) {
  await supabase.from(tableName).delete().eq(foreignKey, foreignId);
  if (rows.length) {
    const { error } = await supabase.from(tableName).insert(rows);
    if (error) throw new Error(`Failed to persist ${tableName}: ${error.message}`);
  }
}

export async function commitBuyerOnboardingV3(
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
): Promise<BuyerOnboardingV3CommitResult> {
  const completion = calculateBuyerOnboardingV3Completion(payload);

  const baseResult = await commitBuyerOnboarding(supabase, userId, {
    ...payload,
    annualProcurementVolume: draftString(payload, "annualProcurementBudget"),
    businessType: draftString(payload, "companyType"),
  });

  const buyerProfileId = baseResult.buyerProfileId;

  const preferencePatch = {
    buyer_profile_id: buyerProfileId,
    profile_id: userId,
    company_id: baseResult.companyId,
    company_type: draftString(payload, "companyType"),
    contact_designation: draftString(payload, "designation"),
    business_email: draftString(payload, "businessEmail"),
    mobile_number: draftString(payload, "mobileNumber"),
    company_website: draftString(payload, "companyWebsite"),
    annual_procurement_budget: draftString(payload, "annualProcurementBudget"),
    order_frequency: draftString(payload, "orderFrequency"),
    procurement_methods: draftStringArray(payload, "procurementMethods"),
    import_experience: draftString(payload, "importExperience"),
    preferred_incoterms: draftStringArray(payload, "preferredIncoterms"),
    preferred_payment_terms: draftStringArray(payload, "preferredPaymentTerms"),
    procurement_team_size: draftString(payload, "procurementTeamSize"),
    company_description: draftString(payload, "companyDescription"),
    logo_url: draftString(payload, "logoUrl"),
    social_links: {
      linkedin: draftString(payload, "linkedinUrl"),
      website: draftString(payload, "companyWebsite"),
      facebook: draftString(payload, "facebookUrl"),
    },
    agreements: {
      buyerAgreement: draftBool(payload, "buyerAgreement"),
      termsAccepted: draftBool(payload, "termsAccepted"),
      privacyAccepted: draftBool(payload, "privacyAccepted"),
    },
    email_verified: draftBool(payload, "emailVerified"),
    mobile_verified: draftBool(payload, "mobileVerified"),
    completion_percent: completion.overallPercent,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error: preferenceError } = await supabase
    .from("buyer_preferences")
    .upsert(preferencePatch, { onConflict: "buyer_profile_id" });
  if (preferenceError) {
    throw new Error(`Failed to save buyer preferences: ${preferenceError.message}`);
  }

  await replaceRows(
    supabase,
    "buyer_industries",
    "buyer_profile_id",
    buyerProfileId,
    draftStringArray(payload, "industries").map((industry_name) => ({
      buyer_profile_id: buyerProfileId,
      industry_name,
    })),
  );

  await replaceRows(
    supabase,
    "buyer_category_interests",
    "buyer_profile_id",
    buyerProfileId,
    draftStringArray(payload, "categoryInterests").map((category_name) => ({
      buyer_profile_id: buyerProfileId,
      category_name,
    })),
  );

  await replaceRows(
    supabase,
    "buyer_import_countries",
    "buyer_profile_id",
    buyerProfileId,
    draftStringArray(payload, "countriesImportedFrom").map((country_name) => ({
      buyer_profile_id: buyerProfileId,
      country_name,
    })),
  );

  await supabase
    .from("profiles")
    .update({
      full_name: draftString(payload, "fullName"),
      phone: draftString(payload, "mobileNumber"),
      profile_status: completion.overallPercent >= 70 ? "complete" : "in_progress",
    })
    .eq("id", userId);

  await supabase.from("platform_events").insert({
    event_type: "buyer_profile_completed",
    actor_id: userId,
    actor_role: "buyer",
    resource_type: "buyer_profile",
    resource_id: buyerProfileId,
    metadata: { completionPercent: completion.overallPercent },
  });

  return {
    buyerProfileId,
    companyId: baseResult.companyId,
    completionPercent: completion.overallPercent,
  };
}

export async function commitSellerOnboardingV3(
  supabase: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
  options: { submitForReview?: boolean } = {},
): Promise<SellerOnboardingV3CommitResult> {
  const completion = calculateSellerOnboardingV3Completion(payload);
  const gate = getSellerV3HardGateStatus(payload);

  const baseResult = await commitSupplierVerificationProfile(
    supabase,
    userId,
    {
      ...payload,
      companyName: draftString(payload, "companyName") ?? draftString(payload, "legalBusinessName"),
      legalBusinessName: draftString(payload, "legalBusinessName") ?? draftString(payload, "companyName"),
      businessType: draftString(payload, "sellerType"),
      companyDescription: draftString(payload, "companyDescription") ?? "Industrial manufacturing supplier",
      numberOfEmployees: draftString(payload, "shopFloorEmployees"),
      yearEstablished: draftString(payload, "yearEstablished"),
      website: draftString(payload, "website") ?? draftString(payload, "companyWebsite"),
      linkedinUrl: draftString(payload, "linkedinUrl"),
      fullAddress: draftString(payload, "registeredAddress") ?? draftString(payload, "factoryAddress"),
      pincode: draftString(payload, "pincode"),
      panCard: draftBool(payload, "panUploaded"),
      companyRegistration: draftBool(payload, "factoryLicenseUploaded"),
      capabilities: buildLegacyCapabilities(payload),
    },
    { submitForReview: false },
  );

  const sellerProfileId = baseResult.sellerProfileId;
  const companyId = baseResult.companyId;

  await persistSellerKyc(supabase, userId, sellerProfileId, companyId, payload);
  await persistSellerBank(supabase, userId, sellerProfileId, companyId, payload);
  await persistSellerManufacturingIntelligence(supabase, userId, sellerProfileId, companyId, payload);

  const nextStatus = options.submitForReview && gate.canActivate ? "UNDER_REVIEW" : "PROFILE_INCOMPLETE";

  await supabase
    .from("seller_profiles")
    .update({
      profile_completion_percent: completion.overallPercent,
      onboarding_status: nextStatus,
      verification_status: options.submitForReview && gate.canActivate ? "in_review" : "pending",
      review_status: options.submitForReview && gate.canActivate ? "in_review" : "pending",
      submitted_at: options.submitForReview && gate.canActivate ? new Date().toISOString() : null,
    })
    .eq("id", sellerProfileId);

  await supabase.from("platform_events").insert({
    event_type: options.submitForReview ? "seller_submitted_for_review" : "onboarding_step_saved",
    actor_id: userId,
    actor_role: "seller",
    resource_type: "seller_profile",
    resource_id: sellerProfileId,
    metadata: {
      flowKey: "seller_onboarding_v3",
      completionPercent: completion.overallPercent,
      canActivate: gate.canActivate,
      missingActivationRequirements: gate.missingRequirements,
    },
  });

  return {
    sellerProfileId,
    companyId,
    completionPercent: completion.overallPercent,
    canActivate: gate.canActivate,
    missingActivationRequirements: gate.missingRequirements,
  };
}

function buildLegacyCapabilities(payload: Record<string, unknown>) {
  const categories = draftStringArray(payload, "capabilityCategories");
  const materials = draftStringArray(payload, "materials");
  return categories.map((category) => ({
    processName: category,
    materialsSupported: materials,
    monthlyCapacity: draftString(payload, "monthlyCapacity"),
    machineCount: Array.isArray(payload.machines) ? String(payload.machines.length) : "",
    toleranceCapability: draftString(payload, "toleranceCapability") ?? "",
    maxPartSize: draftString(payload, "maxPartSize") ?? "",
    minPartSize: draftString(payload, "minPartSize") ?? "",
  }));
}

async function persistSellerKyc(
  supabase: SupabaseClient,
  userId: string,
  sellerProfileId: string,
  companyId: string,
  payload: Record<string, unknown>,
) {
  const checks = [
    {
      verification_type: "gst",
      identifier: draftString(payload, "gstNumber"),
      provider: draftString(payload, "gstProvider"),
      is_verified: draftBool(payload, "gstVerified"),
      evidence: payload.gstDetails ?? {},
    },
    {
      verification_type: "pan",
      identifier: draftString(payload, "panNumber"),
      provider: "document_upload",
      is_verified: draftBool(payload, "panUploaded"),
      evidence: { uploaded: draftBool(payload, "panUploaded") },
    },
    {
      verification_type: "iec",
      identifier: draftString(payload, "iecNumber"),
      provider: "document_upload",
      is_verified: Boolean(draftString(payload, "iecNumber")),
      evidence: { uploaded: Boolean(draftString(payload, "iecDocumentUrl")) },
    },
    {
      verification_type: "factory_license",
      identifier: "factory_license",
      provider: "document_upload",
      is_verified: draftBool(payload, "factoryLicenseUploaded"),
      evidence: { uploaded: draftBool(payload, "factoryLicenseUploaded") },
    },
    {
      verification_type: "udyam",
      identifier: draftString(payload, "udyamNumber"),
      provider: "document_upload",
      is_verified: Boolean(draftString(payload, "udyamNumber")),
      evidence: { uploaded: Boolean(draftString(payload, "udyamCertificateUrl")) },
    },
  ].filter((check) => Boolean(check.identifier) || check.verification_type === "factory_license");

  for (const check of checks) {
    const { error } = await supabase.from("seller_kyc_verifications").upsert(
      {
        seller_profile_id: sellerProfileId,
        company_id: companyId,
        profile_id: userId,
        verification_type: check.verification_type,
        identifier: check.identifier,
        provider: check.provider,
        verification_status: check.is_verified ? "approved" : "pending",
        is_verified: check.is_verified,
        verified_at: check.is_verified ? new Date().toISOString() : null,
        evidence: check.evidence,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "seller_profile_id,verification_type" },
    );
    if (error) throw new Error(`Failed to persist ${check.verification_type} verification: ${error.message}`);
  }
}

async function persistSellerBank(
  supabase: SupabaseClient,
  userId: string,
  sellerProfileId: string,
  companyId: string,
  payload: Record<string, unknown>,
) {
  const accountNumber = draftString(payload, "accountNumber");
  const bankName = draftString(payload, "bankName");
  if (!accountNumber && !bankName) return;

  const verified = draftBool(payload, "bankVerified");
  const { error } = await supabase.from("seller_bank_details").upsert(
    {
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      profile_id: userId,
      bank_name: bankName,
      account_holder_name: draftString(payload, "accountHolderName"),
      account_number_last4: accountLast4(accountNumber),
      account_number_fingerprint: accountFingerprint(accountNumber),
      ifsc_code: draftString(payload, "ifscCode"),
      branch_name: draftString(payload, "branchName"),
      verification_status: verified ? "approved" : "pending",
      verified_at: verified ? new Date().toISOString() : null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "seller_profile_id" },
  );
  if (error) throw new Error(`Failed to persist bank details: ${error.message}`);
}

async function persistSellerManufacturingIntelligence(
  supabase: SupabaseClient,
  userId: string,
  sellerProfileId: string,
  companyId: string,
  payload: Record<string, unknown>,
) {
  await replaceRows(
    supabase,
    "seller_capability_categories",
    "seller_profile_id",
    sellerProfileId,
    draftStringArray(payload, "capabilityCategories").map((category_name) => ({
      seller_profile_id: sellerProfileId,
      category_name,
    })),
  );

  const subCapabilities = Array.isArray(payload.subCapabilities) ? payload.subCapabilities : [];
  await replaceRows(
    supabase,
    "seller_sub_capabilities",
    "seller_profile_id",
    sellerProfileId,
    subCapabilities
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        seller_profile_id: sellerProfileId,
        category_name: String(item.categoryName ?? item.category ?? ""),
        sub_capability_name: String(item.name ?? item.subCapabilityName ?? ""),
      }))
      .filter((item) => item.category_name && item.sub_capability_name),
  );

  await replaceRows(
    supabase,
    "seller_materials",
    "seller_profile_id",
    sellerProfileId,
    draftStringArray(payload, "materials").map((material_name) => ({
      seller_profile_id: sellerProfileId,
      material_name,
    })),
  );

  await replaceRows(
    supabase,
    "seller_machines",
    "seller_profile_id",
    sellerProfileId,
    normalizeObjectArray(payload.machines).map((machine) => ({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      machine_name: String(machine.machineName ?? machine.name ?? "Machine"),
      brand: nullableString(machine.brand),
      model: nullableString(machine.model),
      quantity: toPositiveInt(machine.quantity) ?? 1,
      capacity: nullableString(machine.capacity),
      year_purchased: toPositiveInt(machine.yearPurchased),
      created_by: userId,
    })),
  );

  await replaceRows(
    supabase,
    "seller_certifications",
    "seller_profile_id",
    sellerProfileId,
    normalizeObjectArray(payload.certifications).map((certification) => ({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      certificate_name: String(certification.certificateName ?? certification.name ?? "Certification"),
      certificate_number: nullableString(certification.certificateNumber),
      expiry_date: nullableString(certification.expiryDate),
      document_url: nullableString(certification.documentUrl),
      storage_path: nullableString(certification.storagePath),
      verification_status: "pending",
      created_by: userId,
    })),
  );

  await replaceRows(
    supabase,
    "seller_export_experience",
    "seller_profile_id",
    sellerProfileId,
    normalizeObjectArray(payload.exportExperience).map((experience) => ({
      seller_profile_id: sellerProfileId,
      company_id: companyId,
      customer_name: nullableString(experience.customerName),
      country: String(experience.country ?? "Unknown"),
      product_exported: nullableString(experience.productExported),
      order_value: nullableString(experience.orderValue),
      proof_document_url: nullableString(experience.proofDocumentUrl),
      storage_path: nullableString(experience.storagePath),
      created_by: userId,
    })),
  );

  await replaceRows(
    supabase,
    "seller_quality_systems",
    "seller_profile_id",
    sellerProfileId,
    draftStringArray(payload, "qualitySystems").map((system_name) => ({
      seller_profile_id: sellerProfileId,
      system_name,
    })),
  );
}

function normalizeObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}
