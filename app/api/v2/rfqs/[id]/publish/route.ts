import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";
import { getIrfqAuthContext } from "@/lib/marketplace/irfq/auth-context";
import { publishIrfqDraft } from "@/lib/marketplace/irfq/publish";
import { canUseAdvancedFilters } from "@/lib/marketplace/irfq/subscription-gates";
import type { IrfqDraftPayload } from "@/lib/marketplace/irfq/types";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
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

  if (ownership.rfq.status !== "draft") {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "RFQ is already published" } },
      { status: 400 },
    );
  }

  const ctx = await getIrfqAuthContext(auth.supabase, auth.user.id, auth.role);
  if (!ctx.publishGate.allowed && ctx.publishGate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCUREMENT_GATE", message: ctx.publishGate.message ?? "Publish not allowed" },
        gate: ctx.publishGate,
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = (body.payload ?? body) as IrfqDraftPayload;

  if (
    payload.advancedSupplierFilters &&
    Object.keys(payload.advancedSupplierFilters).length > 0 &&
    !canUseAdvancedFilters(ctx.subscriptionPlan)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SUBSCRIPTION_GATE",
          message: "Upgrade to Premium to use advanced supplier filters",
        },
      },
      { status: 403 },
    );
  }

  const { data: rfqRow } = await auth.supabase
    .from("rfqs")
    .select("project_name, rfq_title, title, project_type, delivery_state, delivery_city, supplier_location_pref")
    .eq("id", id)
    .maybeSingle();

  const { data: industryLink } = await auth.supabase
    .from("rfq_industries")
    .select("industry_id")
    .eq("rfq_id", id)
    .limit(1)
    .maybeSingle();

  const mergedPayload: IrfqDraftPayload = {
    ...payload,
    rfqTitle: payload.rfqTitle ?? rfqRow?.rfq_title ?? rfqRow?.title,
    projectName: payload.projectName ?? rfqRow?.project_name ?? undefined,
    projectType: payload.projectType ?? rfqRow?.project_type ?? undefined,
    industryId: payload.industryId ?? industryLink?.industry_id ?? undefined,
    deliveryState: payload.deliveryState ?? rfqRow?.delivery_state ?? undefined,
    deliveryCity: payload.deliveryCity ?? rfqRow?.delivery_city ?? undefined,
    supplierLocationPref:
      payload.supplierLocationPref ??
      (rfqRow?.supplier_location_pref as Record<string, boolean> | undefined),
  };

  try {
    const result = await publishIrfqDraft(
      auth.supabase,
      id,
      auth.user.id,
      mergedPayload,
      ctx.subscriptionPlan,
    );

    return NextResponse.json({
      success: true,
      data: result.rfq,
      matches: result.matches,
      href: `/rfq/${result.rfq.slug}`,
      gate: ctx.publishGate.message ? ctx.publishGate : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish RFQ";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
