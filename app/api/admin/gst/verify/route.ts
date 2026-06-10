/**
 * POST /api/admin/gst/verify — Verify supplier GSTIN (external API gated)
 */

import { NextResponse } from "next/server";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { isGstApiEnabled, lookupGstin } from "@/lib/services/gst-client";

export const dynamic = "force-dynamic";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export async function POST(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_SETTINGS],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
      { status: 400 },
    );
  }

  const supplierId = typeof body.supplier_id === "string" ? body.supplier_id : null;
  const gstin = typeof body.gstin === "string" ? body.gstin.trim().toUpperCase() : "";

  if (!supplierId || !GSTIN_RE.test(gstin)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Valid supplier_id and GSTIN required" } },
      { status: 400 },
    );
  }

  const { data: supplier } = await auth.supabase
    .from("suppliers")
    .select("id, company_name, state, gstin")
    .eq("id", supplierId)
    .maybeSingle();

  if (!supplier) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 },
    );
  }

  const manual = body.manual === true;
  const legalName =
    typeof body.legal_name === "string" ? body.legal_name.trim() : "";
  const gstState = typeof body.gst_state === "string" ? body.gst_state.trim() : "";

  if (!isGstApiEnabled()) {
    if (!manual) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_CONFIGURED",
            message:
              "GST API is disabled. Pass manual: true with legal_name to record verification offline.",
          },
          manualMode: true,
        },
        { status: 503 },
      );
    }

    if (!legalName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Manual verification requires legal_name",
          },
        },
        { status: 400 },
      );
    }

    await auth.supabase
      .from("gst_verifications")
      .update({ is_current: false })
      .eq("supplier_id", supplierId)
      .eq("is_current", true);

    const { data: verification, error: insertError } = await auth.supabase
      .from("gst_verifications")
      .insert({
        supplier_id: supplierId,
        gstin,
        legal_name: legalName,
        gst_state: gstState || supplier.state,
        status: "active",
        verified_by: auth.user.id,
        is_current: true,
        api_response: { source: "manual_admin" },
        next_revalidation_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insertError.message } },
        { status: 500 },
      );
    }

    await auth.supabase
      .from("suppliers")
      .update({
        gstin,
        gst_legal_name: legalName,
        gst_state: gstState || supplier.state,
        gst_status: "active",
        gst_verified_at: new Date().toISOString(),
        verification_status: "verified",
      })
      .eq("id", supplierId);

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: "gst_verified_manual",
      resource: "gst_verifications",
      resourceId: verification.id,
      details: { supplierId, gstin, legalName },
      severity: "info",
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        verification,
        lookup: { legalName, gstState: gstState || supplier.state, status: "active" },
        isVerified: true,
        manual: true,
      },
    });
  }

  try {
    const lookup = await lookupGstin(gstin);

    await auth.supabase
      .from("gst_verifications")
      .update({ is_current: false })
      .eq("supplier_id", supplierId)
      .eq("is_current", true);

    const { data: verification, error: insertError } = await auth.supabase
      .from("gst_verifications")
      .insert({
        supplier_id: supplierId,
        gstin,
        legal_name: lookup.legalName,
        trade_name: lookup.tradeName,
        gst_state: lookup.gstState,
        gst_state_code: lookup.gstStateCode,
        registration_date: lookup.registrationDate,
        status: lookup.status,
        constitution_of_business: lookup.constitutionOfBusiness,
        taxpayer_type: lookup.taxpayerType,
        api_response: lookup.raw,
        verified_by: auth.user.id,
        is_current: true,
        next_revalidation_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: insertError.message } },
        { status: 500 },
      );
    }

    const stateMatches =
      !lookup.gstState ||
      supplier.state.toLowerCase().includes(lookup.gstState.toLowerCase()) ||
      lookup.gstState.toLowerCase().includes(supplier.state.toLowerCase());

    const isVerified = lookup.status === "active" && stateMatches;

    await auth.supabase
      .from("suppliers")
      .update({
        gstin,
        gst_legal_name: lookup.legalName,
        gst_state: lookup.gstState,
        gst_status: lookup.status,
        gst_registration_date: lookup.registrationDate,
        gst_verified_at: isVerified ? new Date().toISOString() : null,
        ...(isVerified ? { verification_status: "verified" as const } : {}),
      })
      .eq("id", supplierId);

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: "gst_verified",
      resource: "gst_verifications",
      resourceId: verification.id,
      details: { supplierId, gstin, status: lookup.status, stateMatches },
      severity: "info",
      request,
    });

    return NextResponse.json({
      success: true,
      data: { verification, lookup, isVerified, stateMatches },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GST verification failed";
    return NextResponse.json(
      { success: false, error: { code: "GST_API_ERROR", message } },
      { status: 502 },
    );
  }
}
