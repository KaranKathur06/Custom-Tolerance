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
  const expectedBuf = Buffer.from(
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex"),
  );
  const receivedBuf = Buffer.from(signature);

  // Constant-time comparison — prevents timing attacks
  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
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

  // ── Idempotency: Check if this event was already processed ──
  const eventId = event.payload?.payment?.entity?.id
    ? `${eventType}:${event.payload.payment.entity.id}`
    : `${eventType}:${Date.now()}`;

  const { data: existingEvent } = await supabase
    .from("razorpay_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    // Already processed — return success to prevent Razorpay retries
    return NextResponse.json({ success: true, received: true, duplicate: true });
  }

  // Log the event for idempotency tracking
  await supabase.from("razorpay_events").upsert(
    {
      event_id: eventId,
      event_type: eventType,
      payload: event,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "event_id", ignoreDuplicates: true },
  );

  await supabase.from("admin_audit_logs").insert({
    action: `payment.webhook.${eventType}`,
    details: { paymentId, orderId, receivedAt: new Date().toISOString() },
    severity: "info",
  });

  if (eventType === "payment.captured" && paymentId) {
    const { data: paymentRow } = await supabase
      .from("payments")
      .select("id, user_id, metadata, plan, status")
      .or(`razorpay_payment_id.eq.${paymentId},razorpay_order_id.eq.${orderId ?? ""}`)
      .maybeSingle();

    // ── State machine: only allow valid transitions ──
    const currentStatus = paymentRow?.status;
    const VALID_CAPTURE_FROM = new Set(["PENDING", "CREATED", "AUTHORIZED", null, undefined]);

    if (currentStatus && !VALID_CAPTURE_FROM.has(currentStatus)) {
      // Payment is already in a terminal state — log but don't mutate
      await supabase.from("admin_audit_logs").insert({
        action: "payment.webhook.state_machine_blocked",
        details: {
          paymentId,
          currentStatus,
          attemptedTransition: "SUCCESS",
          reason: "Invalid state transition",
        },
        severity: "warning",
      });
      return NextResponse.json({ success: true, received: true, skipped: true });
    }

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
