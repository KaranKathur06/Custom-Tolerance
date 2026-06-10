/**
 * POST /api/payment/webhook — Razorpay webhook (Next.js replacement for NestJS payment module)
 *
 * Enable by setting RAZORPAY_WEBHOOK_SECRET and wiring Razorpay dashboard to this URL.
 * Uses raw body for HMAC signature verification.
 */
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; status?: string } } } };
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
  const paymentId = event.payload?.payment?.entity?.id;

  await supabase.from("admin_audit_logs").insert({
    action: `payment.webhook.${eventType}`,
    details: { paymentId, receivedAt: new Date().toISOString() },
    severity: "info",
  });

  if (eventType === "payment.captured" && paymentId) {
    await supabase
      .from("payments")
      .update({ status: "SUCCESS", updated_at: new Date().toISOString() })
      .eq("external_id", paymentId);
  }

  return NextResponse.json({ success: true, received: true });
}
