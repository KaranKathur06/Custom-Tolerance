/**
 * GET    /api/suppliers/saved — List saved suppliers for authenticated buyer
 * POST   /api/suppliers/saved — Save a supplier
 * DELETE /api/suppliers/saved?supplier_id= — Unsave a supplier
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { evaluateProcurementGate } from "@/lib/marketplace/procurement-gates";
import { getServerDevelopmentTrustMode } from "@/lib/marketplace/trust-mode-server";
import { getBuyerV3GateContext } from "@/lib/marketplace/onboarding-v3-gates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));

  const { data, error, count } = await auth.supabase
    .from("saved_suppliers")
    .select(
      `
      id,
      created_at,
      suppliers:supplier_id(
        id,
        company_name,
        slug,
        logo_url,
        city,
        state,
        verification_status,
        review_avg,
        review_count,
        response_rate
      )
    `,
      { count: "exact" },
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { page, limit, total: count ?? 0 },
  });
}

export async function POST(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  const supplierId = typeof body.supplier_id === "string" ? body.supplier_id : null;
  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "supplier_id is required" } },
      { status: 400 },
    );
  }

  const buyerGateContext = await getBuyerV3GateContext(auth.supabase, auth.user.id);
  const developmentTrustMode = await getServerDevelopmentTrustMode(auth.supabase);
  const gate = evaluateProcurementGate({
    action: "contact_supplier",
    role: auth.role === "seller" ? "both" : "buyer",
    currentTrustLevel: buyerGateContext.trustLevel,
    profileCompletionPercent: buyerGateContext.profileCompletionPercent,
    emailVerified: Boolean(auth.user.email_confirmed_at) || buyerGateContext.emailVerified,
    mobileVerified: buyerGateContext.mobileVerified,
    developmentTrustMode,
  });

  if (!gate.allowed && gate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCUREMENT_GATE", message: gate.message ?? "Save supplier is not allowed" },
        gate,
      },
      { status: 403 },
    );
  }

  const { data, error } = await auth.supabase
    .from("saved_suppliers")
    .upsert({ user_id: auth.user.id, supplier_id: supplierId }, { onConflict: "user_id,supplier_id" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await auth.supabase.from("platform_events").insert({
    event_type: "supplier.saved",
    actor_id: auth.user.id,
    actor_role: auth.role,
    resource_type: "supplier",
    resource_id: supplierId,
  });

  return NextResponse.json({ success: true, data: { id: data.id } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplier_id");

  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "supplier_id is required" } },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase
    .from("saved_suppliers")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("supplier_id", supplierId);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
