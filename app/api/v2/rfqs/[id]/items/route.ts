import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";
import {
  createRfqItem,
  deleteRfqItem,
  listRfqItems,
  updateRfqItem,
} from "@/lib/marketplace/irfq/items";
import { validateItemInput } from "@/lib/marketplace/irfq/validation";
import type { IrfqItemInput } from "@/lib/marketplace/irfq/types";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function parseItem(body: Record<string, unknown>): IrfqItemInput {
  return {
    itemName: String(body.item_name ?? body.itemName ?? ""),
    partNumber: typeof body.part_number === "string" ? body.part_number : null,
    partRevision: typeof body.part_revision === "string" ? body.part_revision : null,
    drawingNumber: typeof body.drawing_number === "string" ? body.drawing_number : null,
    description: typeof body.description === "string" ? body.description : null,
    quantity: Number(body.quantity),
    unit: String(body.unit ?? ""),
    annualRequirement: body.annual_requirement != null ? Number(body.annual_requirement) : null,
    moq: body.moq != null ? Number(body.moq) : null,
    targetPrice: body.target_price != null ? Number(body.target_price) : null,
    currencyCode: typeof body.currency_code === "string" ? body.currency_code : null,
    tolerance: typeof body.tolerance === "string" ? body.tolerance : null,
    toleranceCustom: typeof body.tolerance_custom === "string" ? body.tolerance_custom : null,
    surfaceFinish: Array.isArray(body.surface_finish) ? (body.surface_finish as string[]) : [],
    surfaceFinishCustom:
      typeof body.surface_finish_custom === "string" ? body.surface_finish_custom : null,
    heatTreatment: typeof body.heat_treatment === "string" ? body.heat_treatment : null,
    materials: Array.isArray(body.materials)
      ? (body.materials as IrfqItemInput["materials"])
      : undefined,
    capabilityIds: Array.isArray(body.capability_ids)
      ? (body.capability_ids as string[])
      : undefined,
  };
}

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

  try {
    const items = await listRfqItems(auth.supabase, id);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list items";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}

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
      { success: false, error: { code: "VALIDATION_ERROR", message: "Items locked after publish" } },
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

  const item = parseItem(body);
  const validationError = validateItemInput(item);
  if (validationError) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: validationError } },
      { status: 400 },
    );
  }

  try {
    const created = await createRfqItem(auth.supabase, id, item);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create item";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  if (!itemId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "item_id query param required" } },
      { status: 400 },
    );
  }

  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);
  const ownership = await assertRfqOwnership(auth.supabase, id, auth.user.id, isAdmin);
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: ownership.message } },
      { status: ownership.status },
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

  try {
    const updated = await updateRfqItem(auth.supabase, id, itemId, parseItem(body));
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update item";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  if (!itemId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "item_id query param required" } },
      { status: 400 },
    );
  }

  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);
  const ownership = await assertRfqOwnership(auth.supabase, id, auth.user.id, isAdmin);
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: ownership.message } },
      { status: ownership.status },
    );
  }

  try {
    await deleteRfqItem(auth.supabase, id, itemId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete item";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
