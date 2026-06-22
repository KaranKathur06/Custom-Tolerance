import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";

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

  const { data, error } = await auth.supabase
    .from("rfq_collaborators")
    .select("user_id, role, invited_at, accepted_at, invited_by")
    .eq("rfq_id", id)
    .order("invited_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
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

  let body: { userId?: string; role?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!body.userId?.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
      { status: 400 },
    );
  }

  const role = body.role?.trim() || "viewer";
  const allowedRoles = ["viewer", "engineer", "quality", "procurement"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid collaborator role" } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("rfq_collaborators")
    .upsert(
      {
        rfq_id: id,
        user_id: body.userId,
        role,
        invited_by: auth.user.id,
        invited_at: new Date().toISOString(),
      },
      { onConflict: "rfq_id,user_id" },
    )
    .select("user_id, role, invited_at, accepted_at")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await auth.supabase.from("rfq_activity_log").insert({
    rfq_id: id,
    actor_id: auth.user.id,
    action: "collaborator.invited",
    metadata: { user_id: body.userId, role },
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
