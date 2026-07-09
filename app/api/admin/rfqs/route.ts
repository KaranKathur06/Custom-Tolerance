/**
 * GET  /api/admin/rfqs — RFQ moderation queue
 * PATCH /api/admin/rfqs — Bulk actions via body.rfq_id
 */

import { NextResponse } from "next/server";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { RfqRepository } from "@/lib/domain/repositories/rfq.repository";
import { RfqService } from "@/lib/domain/services/rfq.service";
import { InMemoryEventBus } from "@/lib/domain/events";

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

  const service = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());

  try {
    const { data, count } = await service.listByStatus(status, page, limit);
    return NextResponse.json({
      success: true,
      data: data ?? [],
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
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

  const patch: Record<string, unknown> = {};

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

  const service = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());

  try {
    const data = await service.updateRfq(rfqId, patch);

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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}
