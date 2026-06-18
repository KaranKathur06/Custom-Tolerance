import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import { isGstApiEnabled, lookupGstin } from "@/lib/services/gst-client";

export const dynamic = "force-dynamic";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function isDevelopmentTrustMode() {
  return process.env.NEXT_PUBLIC_DEVELOPMENT_TRUST_MODE !== "false" && process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: { code: "DB_UNAVAILABLE", message: "Database unavailable" } }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } }, { status: 400 });
  }

  const gstin = typeof body.gstNumber === "string"
    ? body.gstNumber.trim().toUpperCase()
    : typeof body.gstin === "string"
      ? body.gstin.trim().toUpperCase()
      : "";

  if (!GSTIN_RE.test(gstin)) {
    await supabase.from("marketplace_risk_signals").insert({
      actor_id: user.id,
      actor_role: "seller",
      resource_type: "onboarding_session",
      signal_key: "invalid_gstin_format",
      severity: "low",
      evidence: { gstin },
    });

    return NextResponse.json(
      { success: false, error: { code: "INVALID_GSTIN", message: "Enter a valid 15-character GST number." } },
      { status: 400 },
    );
  }

  if (!isGstApiEnabled()) {
    if (!isDevelopmentTrustMode()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GST_API_NOT_CONFIGURED",
            message: "GST verification provider is not configured.",
          },
        },
        { status: 503 },
      );
    }

    const legalName = typeof body.legalName === "string" && body.legalName.trim()
      ? body.legalName.trim()
      : "Development Verified Business";

    const lookup = {
      gstin,
      legalName,
      tradeName: typeof body.tradeName === "string" ? body.tradeName.trim() : legalName,
      gstState: typeof body.state === "string" ? body.state.trim() : null,
      gstStateCode: gstin.slice(0, 2),
      registrationDate: null,
      status: "active",
      constitutionOfBusiness: null,
      taxpayerType: null,
      raw: { source: "development_trust_mode" },
    };

    await supabase.from("platform_events").insert({
      event_type: "gst_verification_succeeded",
      actor_id: user.id,
      actor_role: "seller",
      resource_type: "onboarding_session",
      metadata: { gstin, source: "development_trust_mode" },
    });

    return NextResponse.json({
      success: true,
      data: {
        lookup,
        isVerified: true,
        developmentMode: true,
      },
    });
  }

  try {
    await supabase.from("platform_events").insert({
      event_type: "gst_verification_requested",
      actor_id: user.id,
      actor_role: "seller",
      resource_type: "onboarding_session",
      metadata: { gstin },
    });

    const lookup = await lookupGstin(gstin);
    const isVerified = lookup.status === "active";

    await supabase.from("platform_events").insert({
      event_type: isVerified ? "gst_verification_succeeded" : "gst_verification_failed",
      actor_id: user.id,
      actor_role: "seller",
      resource_type: "onboarding_session",
      metadata: { gstin, status: lookup.status },
    });

    if (!isVerified) {
      await supabase.from("marketplace_risk_signals").insert({
        actor_id: user.id,
        actor_role: "seller",
        resource_type: "onboarding_session",
        signal_key: "inactive_gstin",
        severity: "high",
        evidence: { gstin, status: lookup.status },
      });
    }

    return NextResponse.json({ success: true, data: { lookup, isVerified } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GST verification failed";
    await supabase.from("platform_events").insert({
      event_type: "gst_verification_failed",
      actor_id: user.id,
      actor_role: "seller",
      resource_type: "onboarding_session",
      metadata: { gstin, message },
    });

    return NextResponse.json(
      { success: false, error: { code: "GST_API_ERROR", message } },
      { status: 502 },
    );
  }
}
