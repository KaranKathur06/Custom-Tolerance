import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import { commitSellerOnboardingV3 } from "@/lib/marketplace/onboarding-v3-commit";
import {
  deriveMobileVerificationStatus,
  getMobileVerificationRecord,
  normalizeMobileNumber,
} from "@/lib/auth/mobile-verification";
import {
  ONBOARDING_V3_FLOW_VERSION,
  SELLER_ONBOARDING_V3_FLOW_KEY,
  calculateSellerOnboardingV3Completion,
  getSellerV3HardGateStatus,
  type SellerOnboardingV3StepKey,
} from "@/lib/marketplace/onboarding-v3";
import {
  getMissingFieldsMessage,
  validateSellerOnboardingStep,
  type SellerUploadAsset,
} from "@/lib/marketplace/seller-onboarding-validation";

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
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", message: "Your session has expired. Please log in again." }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: "Something went wrong while saving your onboarding. Please try again." },
        { status: 503 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Unable to process your request. Please try again." },
        { status: 400 },
      );
    }
    const action = ((body.action as string | undefined) ?? "save") as "save" | "submit";
    const stepKey = (body.stepKey as string | undefined) ?? "gst_verification";
    const values = ((body.values ?? body.draftPayload ?? {}) as Record<string, unknown>) ?? {};

    const isNested = values && typeof values === "object" && "form" in values;
    const form = (isNested ? (values.form as Record<string, unknown>) : values) ?? {};
    const documents = ((isNested ? values.documents : undefined) ?? {}) as Record<string, SellerUploadAsset | undefined>;
    const images = ((isNested ? values.images : undefined) ?? {}) as Record<string, SellerUploadAsset[]>;
    const video = ((isNested ? values.video : undefined) ?? null) as SellerUploadAsset | null;

    const mobile = normalizeMobileNumber(String(form.mobileNumber ?? ""), "+91");
    const mobileRecord = mobile ? await getMobileVerificationRecord(supabase, user.id, mobile) : null;
    const mobileVerified = deriveMobileVerificationStatus(mobileRecord) === "verified";

    const { data: existingSession } = await supabase
      .from("onboarding_sessions")
      .select("id, validated_steps")
      .eq("user_id", user.id)
      .eq("role", "seller")
      .eq("flow_key", SELLER_ONBOARDING_V3_FLOW_KEY)
      .eq("flow_version", ONBOARDING_V3_FLOW_VERSION)
      .eq("status", "active")
      .maybeSingle();

    const existingValidatedSteps = Array.isArray(existingSession?.validated_steps)
      ? (existingSession.validated_steps as string[])
      : [];

    if (action === "submit") {
      const validation = validateSellerOnboardingStep(stepKey as SellerOnboardingV3StepKey, {
        form,
        documents,
        images,
        video,
      });

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: getMissingFieldsMessage(validation),
            fieldErrors: validation.fieldErrors,
            missingFields: validation.missingLabels,
          },
          { status: 400 },
        );
      }
    }

    const nextValidatedSteps =
      action === "submit"
        ? Array.from(new Set([...existingValidatedSteps, stepKey]))
        : existingValidatedSteps;

    const payload: Record<string, unknown> = {
      ...form,
      emailVerified: Boolean(user.email_confirmed_at) || Boolean(form.emailVerified),
      mobileVerified,
      validatedSteps: nextValidatedSteps,
      documents,
      images,
      video,
    };

    const completion = calculateSellerOnboardingV3Completion(payload, nextValidatedSteps);
    const gate = getSellerV3HardGateStatus(payload);

    const isFinalSubmit = action === "submit" && gate.canActivate;

    const sessionPatch = {
      user_id: user.id,
      role: "seller",
      flow_key: SELLER_ONBOARDING_V3_FLOW_KEY,
      flow_version: ONBOARDING_V3_FLOW_VERSION,
      status: isFinalSubmit ? "completed" : "active",
      current_step: stepKey,
      draft_payload: payload,
      completion_percentage: completion.overallPercent,
      validated_steps: nextValidatedSteps,
      last_completed_step: action === "submit" ? stepKey : null,
      skipped_steps: [],
      skipped_step_details: {},
      is_completed: isFinalSubmit,
      completed_at: isFinalSubmit ? new Date().toISOString() : null,
      validated_at: action === "submit" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let saved;
    let error;

    if (existingSession?.id) {
      ({ data: saved, error } = await supabase
        .from("onboarding_sessions")
        .update(sessionPatch)
        .eq("id", existingSession.id)
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
      console.error("[seller-onboarding] session save failed:", error.message);
      return NextResponse.json(
        {
          error: "SAVE_FAILED",
          message: "Something went wrong while saving your onboarding. Your information has not been lost. Please try again.",
        },
        { status: 500 },
      );
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
          console.error("[seller-onboarding] commit failed:", err);
          return NextResponse.json(
            {
              error: "COMMIT_FAILED",
              message: "Something went wrong while saving your onboarding. Your information has not been lost. Please try again.",
            },
            { status: 400 },
          );
        }
      }
    }

    return NextResponse.json({ success: true, session: saved, completion, gate, result });
  } catch (err) {
    console.error("[seller-onboarding] unexpected error:", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "Something went wrong while saving your onboarding. Your information has not been lost. Please try again.",
      },
      { status: 500 },
    );
  }
}
