import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { createIrfqDraft } from "@/lib/marketplace/irfq/create-draft";
import { getIrfqAuthContext } from "@/lib/marketplace/irfq/auth-context";
import { canUseCreationMethod } from "@/lib/marketplace/irfq/subscription-gates";
import type { IrfqCreationMethod, IrfqDraftPayload } from "@/lib/marketplace/irfq/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "draft";

  const { data, error } = await auth.supabase
    .from("rfqs")
    .select("id, title, slug, status, creation_method, composer_step, created_at, updated_at")
    .eq("buyer_user_id", auth.user.id)
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
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
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const creationMethod = (typeof body.creation_method === "string"
    ? body.creation_method
    : "manual") as IrfqCreationMethod;

  const ctx = await getIrfqAuthContext(auth.supabase, auth.user.id, auth.role);
  const methodGate = canUseCreationMethod(creationMethod, ctx.subscriptionPlan);
  if (!methodGate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SUBSCRIPTION_GATE", message: methodGate.message },
      },
      { status: 403 },
    );
  }

  const payload = (body.payload ?? body) as IrfqDraftPayload;

  try {
    const draft = await createIrfqDraft(auth.supabase, {
      buyerProfileId: ctx.buyerProfileId,
      buyerUserId: auth.user.id,
      companyId: ctx.companyId,
      creationMethod,
      subscriptionPlan: ctx.subscriptionPlan,
      payload,
    });

    return NextResponse.json({ success: true, data: draft }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
