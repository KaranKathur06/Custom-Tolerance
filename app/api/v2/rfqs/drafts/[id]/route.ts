import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { updateIrfqDraft } from "@/lib/marketplace/irfq/create-draft";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";
import { listRfqItems } from "@/lib/marketplace/irfq/items";
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

  const { data: rfq, error } = await auth.supabase
    .from("rfqs")
    .select(
      `
      id, title, slug, status, description, creation_method, privacy_level,
      project_name, rfq_title, project_type, composer_step, composer_data,
      currency_code, target_price, buyer_country, buyer_state, buyer_city,
      delivery_state, delivery_city, delivery_postal_code, delivery_mode,
      shipping_preferences, payment_terms, payment_mode, quotation_deadline,
      manufacturing_lead_time_days, expected_delivery_date,
      supplier_location_pref, supplier_requirements, advanced_supplier_filters,
      max_supplier_matches, subscription_plan_at_create, created_at, updated_at,
      rfq_industries(industry_id),
      rfq_capabilities(capability_id),
      rfq_files(id, file_name, file_type, file_size_bytes, mime_type, virus_scan_status, created_at)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const items = await listRfqItems(auth.supabase, id);

  return NextResponse.json({ success: true, data: { ...rfq, items } });
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
      { success: false, error: { code: "VALIDATION_ERROR", message: "Only draft RFQs can be edited" } },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const payload = (body.payload ?? body) as IrfqDraftPayload;

  try {
    const updated = await updateIrfqDraft(auth.supabase, id, auth.user.id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update draft";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
