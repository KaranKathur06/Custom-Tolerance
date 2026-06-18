import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { commitBuyerOnboardingV3 } from "@/lib/marketplace/onboarding-v3-commit";
import {
  BUYER_ONBOARDING_V3_FLOW_KEY,
  ONBOARDING_V3_FLOW_VERSION,
  calculateBuyerOnboardingV3Completion,
} from "@/lib/marketplace/onboarding-v3";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getServerUser();
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
    .eq("role", "buyer")
    .eq("flow_key", BUYER_ONBOARDING_V3_FLOW_KEY)
    .eq("flow_version", ONBOARDING_V3_FLOW_VERSION)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data ?? null });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const action = (body.action as string | undefined) ?? "commit";
    const values = ((body.values ?? body) as Record<string, unknown>) ?? {};
    const payload = {
      ...values,
      emailVerified: Boolean(user.email_confirmed_at) || Boolean(values.emailVerified),
    };
    const completion = calculateBuyerOnboardingV3Completion(payload);

    const sessionPatch = {
      user_id: user.id,
      role: "buyer",
      flow_key: BUYER_ONBOARDING_V3_FLOW_KEY,
      flow_version: ONBOARDING_V3_FLOW_VERSION,
      status: action === "commit" ? "completed" : "active",
      current_step: (body.stepKey as string | undefined) ?? "buyer_registration",
      draft_payload: payload,
      completion_percentage: completion.overallPercent,
      last_completed_step: (body.stepKey as string | undefined) ?? null,
      skipped_steps: [],
      skipped_step_details: {},
      is_completed: action === "commit",
      completed_at: action === "commit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("onboarding_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "buyer")
      .eq("flow_key", BUYER_ONBOARDING_V3_FLOW_KEY)
      .eq("flow_version", ONBOARDING_V3_FLOW_VERSION)
      .eq("status", "active")
      .maybeSingle();

    let savedSession;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .update(sessionPatch)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      savedSession = data;
    } else {
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .insert(sessionPatch)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      savedSession = data;
    }

    if (action === "save") {
      return NextResponse.json({ success: true, session: savedSession, completion });
    }

    const result = await commitBuyerOnboardingV3(supabase, user.id, payload);
    return NextResponse.json({ success: true, result, completion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
