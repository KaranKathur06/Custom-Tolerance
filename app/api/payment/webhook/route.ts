/**
 * POST /api/payment/webhook — Razorpay webhook (Next.js replacement for NestJS payment module)
 */
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { activateIrfqSubscription } from "@/lib/marketplace/irfq/subscription-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        status?: string;
        order_id?: string;
        notes?: { userId?: string; planId?: string };
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: { userId?: string; planId?: string };
      };
    };
  };
};

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_CONFIGURED", message: "Payment webhooks are not configured" } },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_SIGNATURE", message: "Missing webhook signature" } },
      { status: 400 },
    );
  }

  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  if (expected !== signature) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
      { status: 401 },
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PAYLOAD", message: "Invalid JSON payload" } },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: { code: "DB_UNAVAILABLE", message: "Database unavailable" } },
      { status: 503 },
    );
  }

  const eventType = event.event ?? "unknown";
  const paymentEntity = event.payload?.payment?.entity;
  const paymentId = paymentEntity?.id;
  const orderId = paymentEntity?.order_id ?? event.payload?.order?.entity?.id;

  await supabase.from("admin_audit_logs").insert({
    action: `payment.webhook.${eventType}`,
    details: { paymentId, orderId, receivedAt: new Date().toISOString() },
    severity: "info",
  });

  if (eventType === "payment.captured" && paymentId) {
    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id, user_id, metadata, plan")
      .or(`razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId ?? ""}`)
      .maybeSingle();

    await supabase
      .from("payments")
      .update({
        status: "SUCCESS",
        razorpay_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .or(`razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId ?? ""}`);

    const userId =
      paymentRow?.user_id ??
      paymentEntity?.notes?.userId ??
      event.payload?.order?.entity?.notes?.userId;
    const planId =
      paymentRow?.plan ??
      (paymentRow?.metadata as { planId?: string } | null)?.planId ??
      paymentEntity?.notes?.planId ??
      event.payload?.order?.entity?.notes?.planId;

    if (userId) {
      await activateIrfqSubscription(supabase, userId, planId, paymentId);
    }
  }

  return NextResponse.json({ success: true, received: true });
}
