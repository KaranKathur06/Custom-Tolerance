import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import { commitSellerOnboardingV3 } from "@/lib/marketplace/onboarding-v3-commit";
import {
  ONBOARDING_V3_FLOW_VERSION,
  SELLER_ONBOARDING_V3_FLOW_KEY,
  calculateSellerOnboardingV3Completion,
  getSellerV3HardGateStatus,
} from "@/lib/marketplace/onboarding-v3";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const user = await getServerUser();
  return user ?? null;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("role", "seller")
    .eq("flow_key", SELLER_ONBOARDING_V3_FLOW_KEY)
    .eq("flow_version", ONBOARDING_V3_FLOW_VERSION)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session: data ?? null,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const body = await request.json();
  const action = ((body.action as string | undefined) ?? "save") as "save" | "submit";
  const values = ((body.values ?? body.draftPayload ?? {}) as Record<string, unknown>) ?? {};
  const payload: Record<string, unknown> = {
    ...values,
    emailVerified: Boolean(user.email_confirmed_at) || Boolean(values.emailVerified),
  };
  const completion = calculateSellerOnboardingV3Completion(payload);
  const gate = getSellerV3HardGateStatus(payload);

  const sessionPatch = {
    user_id: user.id,
    role: "seller",
    flow_key: SELLER_ONBOARDING_V3_FLOW_KEY,
    flow_version: ONBOARDING_V3_FLOW_VERSION,
    status: action === "submit" && gate.canActivate ? "completed" : "active",
    current_step: (body.stepKey as string | undefined) ?? "gst_verification",
    draft_payload: payload,
    completion_percentage: completion.overallPercent,
    last_completed_step: (body.stepKey as string | undefined) ?? null,
    skipped_steps: [],
    skipped_step_details: {},
    is_completed: action === "submit" && gate.canActivate,
    completed_at: action === "submit" && gate.canActivate ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("onboarding_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "seller")
    .eq("flow_key", SELLER_ONBOARDING_V3_FLOW_KEY)
    .eq("flow_version", ONBOARDING_V3_FLOW_VERSION)
    .eq("status", "active")
    .maybeSingle();

  let saved;
  let error;

  if (existing?.id) {
    ({ data: saved, error } = await supabase
      .from("onboarding_sessions")
      .update(sessionPatch)
      .eq("id", existing.id)
      .select("*")
      .single());
  } else {
    ({ data: saved, error } = await supabase
      .from("onboarding_sessions")
      .insert(sessionPatch)
      .select("*")
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasCompanyIdentity = Boolean(payload.companyName || payload.legalBusinessName);
  let result = null;

  if (hasCompanyIdentity) {
    try {
      result = await commitSellerOnboardingV3(supabase, user.id, payload, {
        submitForReview: action === "submit",
      });
    } catch (err) {
      if (action === "submit") {
        const message = err instanceof Error ? err.message : "Submission failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ success: true, session: saved, completion, gate, result });
}
