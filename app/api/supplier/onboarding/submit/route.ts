import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import { commitSupplierVerificationProfile } from "@/lib/marketplace/supplier-verification-commit";
import {
  applySellerOnboardingPatch,
  createSellerOnboardingSession,
  toOnboardingSessionUpsert,
  type OnboardingSession,
} from "@/lib/marketplace/onboarding-session";

export const dynamic = "force-dynamic";

function mapDbSession(row: Record<string, unknown>): OnboardingSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    role: (row.role as OnboardingSession["role"]) ?? "seller",
    flowKey: (row.flow_key as string) ?? "supplier_verification_v2",
    flowVersion: (row.flow_version as number) ?? 2,
    currentStep: row.current_step as string,
    draftPayload: (row.draft_payload as Record<string, unknown>) ?? {},
    completionPercentage: (row.completion_percentage as number) ?? 0,
    lastCompletedStep: (row.last_completed_step as string) ?? null,
    skippedSteps: (row.skipped_steps as string[]) ?? [],
    skippedStepDetails: (row.skipped_step_details as OnboardingSession["skippedStepDetails"]) ?? {},
    isCompleted: Boolean(row.is_completed),
    status: (row.status as OnboardingSession["status"]) ?? "active",
  };
}

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: { code: "DB_UNAVAILABLE", message: "Database unavailable" } }, { status: 503 });
  }

  const body = await request.json();
  const action = body.action as "save" | "submit";

  if (action === "submit") {
    const draftPayload = (body.draftPayload ?? {}) as Record<string, unknown>;

    try {
      const result = await commitSupplierVerificationProfile(supabase, user.id, {
        ...draftPayload,
        emailVerified: Boolean(user.email_confirmed_at) || Boolean(draftPayload.emailVerified),
      }, { submitForReview: true });

      await supabase
        .from("onboarding_sessions")
        .update({ status: "completed", is_completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("flow_key", "supplier_verification_v2")
        .eq("status", "active");

      return NextResponse.json({ success: true, data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      return NextResponse.json({ success: false, error: { code: "SUBMIT_FAILED", message } }, { status: 400 });
    }
  }

  const patch = {
    stepKey: body.stepKey as string,
    values: (body.values ?? {}) as Record<string, unknown>,
    markComplete: Boolean(body.markComplete),
    skipStep: Boolean(body.skipStep),
    skipReason: body.skipReason as string | null,
    developmentTrustMode: body.developmentTrustMode !== false,
  };

  const { data: existing } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("role", "seller")
    .eq("flow_key", "supplier_verification_v2")
    .eq("status", "active")
    .maybeSingle();

  const session = existing
    ? applySellerOnboardingPatch(mapDbSession(existing), patch)
    : applySellerOnboardingPatch(
        createSellerOnboardingSession({ userId: user.id, initialPayload: patch.values }),
        patch,
      );

  const upsert = toOnboardingSessionUpsert(session);

  if (action === "save") {
    try {
      await commitSupplierVerificationProfile(supabase, user.id, session.draftPayload, {
        submitForReview: false,
      });
    } catch {
      // Non-blocking during incremental saves
    }
  }

  let saved;
  let error;

  if (session.id) {
    ({ data: saved, error } = await supabase
      .from("onboarding_sessions")
      .update(upsert)
      .eq("id", session.id)
      .select("*")
      .single());
  } else {
    ({ data: saved, error } = await supabase
      .from("onboarding_sessions")
      .insert(upsert)
      .select("*")
      .single());
  }

  if (error) {
    return NextResponse.json({ success: false, error: { code: "SAVE_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { session: mapDbSession(saved) } });
}
