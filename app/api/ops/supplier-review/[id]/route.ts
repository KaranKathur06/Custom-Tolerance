import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import type { SupplierOnboardingStatus } from "@/lib/marketplace/supplier-onboarding-status";
import { canTransitionOnboardingStatus } from "@/lib/marketplace/supplier-onboarding-status";

export const dynamic = "force-dynamic";

type ReviewAction = "approve" | "reject" | "request_changes" | "suspend";

const ACTION_STATUS_MAP: Record<ReviewAction, SupplierOnboardingStatus> = {
  approve: "APPROVED",
  reject: "REJECTED",
  request_changes: "CHANGES_REQUESTED",
  suspend: "SUSPENDED",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await protectApiRoute(request, {
    requiredRoles: ["admin", "super_admin", "supplier_success", "moderator"],
    requireAdmin2FA: true,
  });

  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supabase = auth.supabase;

  const body = await request.json();
  const action = body.action as ReviewAction;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!ACTION_STATUS_MAP[action]) {
    return NextResponse.json({ success: false, error: { code: "INVALID_ACTION", message: "Invalid review action" } }, { status: 400 });
  }

  const { data: seller, error: fetchError } = await supabase
    .from("seller_profiles")
    .select("id, profile_id, company_id, onboarding_status")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !seller) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } }, { status: 404 });
  }

  const previousStatus = seller.onboarding_status as SupplierOnboardingStatus;
  const newStatus = ACTION_STATUS_MAP[action];

  if (!canTransitionOnboardingStatus(previousStatus, newStatus)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TRANSITION", message: `Cannot transition from ${previousStatus} to ${newStatus}` } },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const sellerPatch: Record<string, unknown> = {
    onboarding_status: newStatus,
    verification_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "in_review",
    review_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "in_review",
    review_notes: notes || null,
    updated_at: now,
  };

  if (action === "approve") {
    sellerPatch.approved_at = now;
    sellerPatch.trust_level = 3;
  } else if (action === "reject") {
    sellerPatch.rejected_at = now;
  } else if (action === "suspend") {
    sellerPatch.suspended_at = now;
  } else if (action === "request_changes") {
    sellerPatch.change_request_notes = notes || "Please update your profile and resubmit.";
  }

  const { error: updateError } = await supabase
    .from("seller_profiles")
    .update(sellerPatch)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: { code: "UPDATE_FAILED", message: updateError.message } }, { status: 500 });
  }

  if (seller.company_id) {
    await supabase
      .from("companies")
      .update({
        verification_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "in_review",
        trust_level: action === "approve" ? 3 : 0,
        updated_at: now,
      })
      .eq("id", seller.company_id);
  }

  await supabase.from("supplier_review_logs").insert({
    seller_profile_id: seller.id,
    company_id: seller.company_id,
    actor_id: auth.user.id,
    action: `admin_${action}`,
    previous_status: previousStatus,
    new_status: newStatus,
    notes: notes || null,
    created_by: auth.user.id,
  });

  if (action === "approve") {
    await supabase.from("supplier_trust_scores").upsert(
      {
        seller_profile_id: seller.id,
        verification_score: 100,
        updated_at: now,
      },
      { onConflict: "seller_profile_id" },
    );
  }

  return NextResponse.json({
    success: true,
    data: { sellerProfileId: seller.id, previousStatus, newStatus },
  });
}
