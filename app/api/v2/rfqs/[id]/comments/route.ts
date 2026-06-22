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
    .from("rfq_comments")
    .select("id, parent_id, author_id, body, mentions, created_at, updated_at")
    .eq("rfq_id", id)
    .order("created_at", { ascending: true });

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

  let body: { body?: string; parentId?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!body.body?.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Comment body is required" } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("rfq_comments")
    .insert({
      rfq_id: id,
      parent_id: body.parentId ?? null,
      author_id: auth.user.id,
      body: body.body.trim(),
    })
    .select("id, parent_id, author_id, body, created_at")
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
    action: "comment.added",
    metadata: { comment_id: data.id },
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
