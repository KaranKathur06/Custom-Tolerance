/**
 * GET  /api/admin/rfqs — RFQ moderation queue
 * PATCH /api/admin/rfqs — Bulk actions via body.rfq_id
 */

import { NextResponse } from "next/server";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_DASHBOARD],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));

  let query = auth.supabase
    .from("rfqs")
    .select(
      `
      id, title, slug, description, status, city, state, created_at, updated_at,
      buyer_company_name, visibility_level, material_grade, manufacturing_process,
      quotes(count)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);

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

export async function PATCH(request: Request) {
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

  const rfqId = typeof body.rfq_id === "string" ? body.rfq_id : null;
  const action = typeof body.action === "string" ? body.action : null;

  if (!rfqId || !action) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "rfq_id and action required" } },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "close") patch.status = "closed";
  else if (action === "cancel") patch.status = "cancelled";
  else if (action === "reopen") patch.status = "open";
  else if (action === "flag") patch.visibility_level = "review";
  else if (action === "update_category") {
    if (typeof body.manufacturing_process === "string") {
      patch.manufacturing_process = body.manufacturing_process;
    }
    if (typeof body.material_grade === "string") {
      patch.material_grade = body.material_grade;
    }
  } else {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown action" } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("rfqs")
    .update(patch)
    .eq("id", rfqId)
    .select("id, title, slug, status")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await auth.supabase.from("platform_events").insert({
    event_type: `rfq.admin_${action}`,
    actor_id: auth.user.id,
    actor_role: auth.role,
    resource_type: "rfq",
    resource_id: rfqId,
    metadata: patch,
  });

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: `rfq_${action}`,
    resource: "rfqs",
    resourceId: rfqId,
    details: patch,
    severity: "info",
    request,
  });

  return NextResponse.json({ success: true, data });
}
