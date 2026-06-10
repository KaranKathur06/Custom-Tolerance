/**
 * POST /api/payment/create-order — Create Razorpay order (Next.js replacement for NestJS)
 */
import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "Payments are not enabled. Contact support for membership upgrades.",
        },
      },
      { status: 503 },
    );
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const currency = (body.currency as string) || "INR";
  const planId = body.planId as string | undefined;

  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid amount" } },
      { status: 400 },
    );
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt: `ct_${auth.user.id.slice(0, 8)}_${Date.now()}`,
      notes: { userId: auth.user.id, planId: planId ?? null },
    }),
  });

  const order = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { success: false, error: { code: "RAZORPAY_ERROR", message: order.error?.description ?? "Order creation failed" } },
      { status: 502 },
    );
  }

  await auth.supabase.from("payments").insert({
    user_id: auth.user.id,
    external_id: order.id,
    amount: amount / 100,
    currency,
    status: "PENDING",
    metadata: { planId, razorpayOrderId: order.id },
  });

  return NextResponse.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    },
  });
}
