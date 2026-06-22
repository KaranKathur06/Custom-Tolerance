import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";
import { computeRfqRiskAssessment } from "@/lib/marketplace/irfq/risk-scoring";
import type { IrfqDraftPayload } from "@/lib/marketplace/irfq/types";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);
  const ownership = await assertRfqOwnership(auth.supabase, id, auth.user.id, isAdmin);
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: ownership.message } },
      { status: ownership.status },
    );
  }

  const { data: rfqRow } = await auth.supabase
    .from("rfqs")
    .select(
      "project_name, rfq_title, title, project_type, delivery_state, delivery_city, supplier_location_pref, target_price, quotation_deadline, expected_delivery_date, advanced_supplier_filters, capability_matrix_filters, risk_level, risk_score, risk_factors",
    )
    .eq("id", id)
    .maybeSingle();

  const { data: industryLink } = await auth.supabase
    .from("rfq_industries")
    .select("industry_id")
    .eq("rfq_id", id)
    .limit(1)
    .maybeSingle();

  const { data: capabilityLinks } = await auth.supabase
    .from("rfq_capabilities")
    .select("capability_id")
    .eq("rfq_id", id);

  const { data: itemRows } = await auth.supabase
    .from("rfq_items")
    .select("tolerance")
    .eq("rfq_id", id);

  const payload: IrfqDraftPayload = {
    rfqTitle: rfqRow?.rfq_title ?? rfqRow?.title ?? undefined,
    projectName: rfqRow?.project_name ?? undefined,
    projectType: rfqRow?.project_type ?? undefined,
    industryId: industryLink?.industry_id ?? undefined,
    capabilityIds: (capabilityLinks ?? []).map((c) => c.capability_id),
    deliveryState: rfqRow?.delivery_state ?? undefined,
    deliveryCity: rfqRow?.delivery_city ?? undefined,
    supplierLocationPref: rfqRow?.supplier_location_pref as Record<string, boolean> | undefined,
    targetPrice: rfqRow?.target_price != null ? Number(rfqRow.target_price) : null,
    quotationDeadline: rfqRow?.quotation_deadline ?? null,
    expectedDeliveryDate: rfqRow?.expected_delivery_date ?? null,
    advancedSupplierFilters: rfqRow?.advanced_supplier_filters as Record<string, unknown> | undefined,
    capabilityMatrixFilters: rfqRow?.capability_matrix_filters as IrfqDraftPayload["capabilityMatrixFilters"],
  };

  const itemTolerances = (itemRows ?? [])
    .map((row) => row.tolerance as string | null)
    .filter(Boolean) as string[];

  const assessment = await computeRfqRiskAssessment(auth.supabase, id, payload, itemTolerances);

  return NextResponse.json({ success: true, data: assessment });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  let body: { payload?: IrfqDraftPayload } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = body.payload ?? {};
  const { data: itemRows } = await auth.supabase
    .from("rfq_items")
    .select("tolerance")
    .eq("rfq_id", id);

  const itemTolerances = (itemRows ?? [])
    .map((row) => row.tolerance as string | null)
    .filter(Boolean) as string[];

  const assessment = await computeRfqRiskAssessment(auth.supabase, id, payload, itemTolerances);

  return NextResponse.json({ success: true, data: assessment });
}
