import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import { getServerDevelopmentTrustMode } from "@/lib/marketplace/trust-mode-server";
import {
  buildSupplierProfileDataFromDraft,
  calculateSupplierProfileCompletion,
  getRemainingCompletionItems,
} from "@/lib/marketplace/supplier-profile-completion";
import { evaluateSupplierMarketplaceGate } from "@/lib/marketplace/supplier-marketplace-gates";
import type { SupplierOnboardingStatus } from "@/lib/marketplace/supplier-onboarding-status";
import { getSupplierVerificationBadges, calculateSupplierTrustScore } from "@/lib/marketplace/supplier-trust-score";
import { MANDATORY_DOCUMENT_TYPES } from "@/lib/marketplace/supplier-profile-completion";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: { code: "DB_UNAVAILABLE", message: "Database unavailable" } }, { status: 503 });
  }

  const developmentTrustMode = await getServerDevelopmentTrustMode(supabase);

  const sellerResult = await supabase
    .from("seller_profiles")
    .select("id, onboarding_status, profile_completion_percent, verification_status, submitted_at, approved_at, change_request_notes, review_notes")
    .eq("profile_id", user.id)
    .maybeSingle();

  const sellerId = sellerResult.data?.id;

  const [sessionResult, companyResult, docsResult, mediaResult, trustResult] = await Promise.all([
      supabase
        .from("onboarding_sessions")
        .select("draft_payload, completion_percentage, current_step, is_completed")
        .eq("user_id", user.id)
        .eq("role", "seller")
        .eq("flow_key", "supplier_verification_v2")
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("companies")
        .select("id, name, gst_number, email_verified, phone_verified, verification_status")
        .or(`owner_id.eq.${user.id},profile_id.eq.${user.id}`)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("supplier_documents")
        .select("document_type, verification_status")
        .eq("profile_id", user.id)
        .is("deleted_at", null),
      sellerId
        ? supabase
            .from("supplier_media")
            .select("id")
            .eq("seller_profile_id", sellerId)
            .is("deleted_at", null)
        : Promise.resolve({ data: [] as { id: string }[] }),
      sellerId
        ? supabase
            .from("supplier_trust_scores")
            .select("trust_score, total_score")
            .eq("seller_profile_id", sellerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const seller = sellerResult.data;
  const draft = (sessionResult.data?.draft_payload ?? {}) as Record<string, unknown>;
  const company = companyResult.data;

  const emailVerified = Boolean(user.email_confirmed_at) || Boolean(company?.email_verified) || Boolean(draft.emailVerified);
  const mobileVerified = Boolean(company?.phone_verified) || Boolean(draft.mobileVerified ?? draft.phoneVerified);

  const profileData = buildSupplierProfileDataFromDraft({
    ...draft,
    emailVerified,
    mobileVerified,
    gstNumber: draft.gstNumber ?? company?.gst_number,
  });

  const completion = calculateSupplierProfileCompletion(profileData);
  const remaining = getRemainingCompletionItems(completion);

  const uploadedDocTypes = new Set((docsResult.data ?? []).map((d) => d.document_type));
  const requiredDocumentsUploaded = MANDATORY_DOCUMENT_TYPES.every((t) => uploadedDocTypes.has(t));

  const onboardingStatus = (seller?.onboarding_status ?? "REGISTERED") as SupplierOnboardingStatus;

  const marketplaceGate = evaluateSupplierMarketplaceGate({
    action: "add_product",
    onboardingStatus,
    profileCompletionPercent: completion.overallPercent,
    emailVerified,
    mobileVerified,
    requiredDocumentsUploaded,
    developmentTrustMode,
  });

  const trustBreakdown = calculateSupplierTrustScore({
    profileCompletionPercent: completion.overallPercent,
    documentsUploaded: docsResult.data?.length ?? 0,
    documentsRequired: MANDATORY_DOCUMENT_TYPES.length,
    documentsApproved: (docsResult.data ?? []).filter((d) => d.verification_status === "approved").length,
    emailVerified,
    mobileVerified,
    factoryPhotoCount: mediaResult.data?.length ?? 0,
    certificationCount: 0,
    adminApproved: onboardingStatus === "APPROVED",
  });

  const badges = getSupplierVerificationBadges({
    adminApproved: onboardingStatus === "APPROVED",
    gstVerified: (docsResult.data ?? []).some((d) => d.document_type === "gst_certificate" && d.verification_status === "approved"),
    phoneVerified: mobileVerified,
    emailVerified,
    factoryPhotoCount: mediaResult.data?.length ?? 0,
  });

  return NextResponse.json({
    success: true,
    data: {
      onboardingStatus,
      profileCompletionPercent: completion.overallPercent,
      completionSections: completion.sections,
      remainingItems: remaining,
      emailVerified,
      mobileVerified,
      requiredDocumentsUploaded,
      marketplaceUnlocked: marketplaceGate.allowed && !marketplaceGate.hardBlocked,
      marketplaceGate,
      trustScore: trustResult.data?.trust_score ?? trustBreakdown.trustScore,
      badges,
      changeRequestNotes: seller?.change_request_notes ?? null,
      reviewNotes: seller?.review_notes ?? null,
      submittedAt: seller?.submitted_at ?? null,
      approvedAt: seller?.approved_at ?? null,
      currentWizardStep: sessionResult.data?.current_step ?? "company_information",
      developmentTrustMode,
    },
  });
}
