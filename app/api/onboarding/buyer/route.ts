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

/* ─────────────────────────────────────────────────────────────────────────
   Normalise incoming payload for backward compatibility.
   - companyType (legacy string) → companyTypes (string[])
   - countriesImportedFrom (legacy comma-string) → string[]
   ───────────────────────────────────────────────────────────────────────── */
function normalizeBuyerPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...raw };

  // Migrate legacy single-string companyType → companyTypes array
  if (
    !Array.isArray(out.companyTypes) ||
    (out.companyTypes as unknown[]).length === 0
  ) {
    const legacy = out.companyType;
    if (typeof legacy === "string" && legacy.trim()) {
      out.companyTypes = [legacy.trim()];
    }
  }
  // Ensure it is always an array
  if (!Array.isArray(out.companyTypes)) {
    out.companyTypes = [];
  }

  // Migrate legacy comma-separated countriesImportedFrom
  if (!Array.isArray(out.countriesImportedFrom)) {
    const raw_ = out.countriesImportedFrom;
    if (typeof raw_ === "string" && (raw_ as string).trim()) {
      out.countriesImportedFrom = (raw_ as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      out.countriesImportedFrom = [];
    }
  }

  // Stamp agreement metadata if agreement is accepted and viewedAt is missing
  const now = new Date().toISOString();
  if (out.buyerAgreement && !out.buyerAgreementViewedAt) {
    out.buyerAgreementViewedAt = now;
  }
  if (out.termsAccepted && !out.termsViewedAt) {
    out.termsViewedAt = now;
  }
  if (out.privacyAccepted && !out.privacyViewedAt) {
    out.privacyViewedAt = now;
  }

  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   GET — load active draft session
   ───────────────────────────────────────────────────────────────────────── */
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
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

/* ─────────────────────────────────────────────────────────────────────────
   POST — save draft or commit buyer profile
   ───────────────────────────────────────────────────────────────────────── */
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const action = (body.action as string | undefined) ?? "commit";
    const rawValues = ((body.values ?? body) as Record<string, unknown>) ?? {};

    // Normalise + enrich
    const payload = normalizeBuyerPayload({
      ...rawValues,
      // Always trust server-side email verification status
      emailVerified:
        Boolean(user.email_confirmed_at) || Boolean(rawValues.emailVerified),
    });

    const completion = calculateBuyerOnboardingV3Completion(payload);

    const sessionPatch = {
      user_id: user.id,
      role: "buyer",
      flow_key: BUYER_ONBOARDING_V3_FLOW_KEY,
      flow_version: ONBOARDING_V3_FLOW_VERSION,
      status: action === "commit" ? "completed" : "active",
      current_step:
        (body.stepKey as string | undefined) ?? "buyer_registration",
      draft_payload: payload,
      completion_percentage: completion.overallPercent,
      last_completed_step: (body.stepKey as string | undefined) ?? null,
      skipped_steps: [],
      skipped_step_details: {},
      is_completed: action === "commit",
      completed_at: action === "commit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    // Upsert onboarding session
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
      return NextResponse.json({
        success: true,
        session: savedSession,
        completion,
      });
    }

    // Commit — write to buyer profile tables
    const result = await commitBuyerOnboardingV3(supabase, user.id, payload);
    return NextResponse.json({ success: true, result, completion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
