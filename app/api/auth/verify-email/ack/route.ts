/**
 * POST /api/auth/verify-email/ack
 * Records that signUp() already dispatched the OTP email (no resend).
 * Initializes resend cooldown without sending a duplicate email.
 */

import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import {
  logOtpEvent,
  lookupUserByEmail,
  normalizeEmail,
  recordOtpSent,
} from "@/lib/auth/verification-security";
import {
  getClientIp,
  getSessionFingerprint,
  jsonResponseWithCookies,
} from "@/lib/auth/route-handler-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body?.email ?? "");

    if (!email) {
      return jsonResponseWithCookies({ error: "Email required." }, [], { status: 400 });
    }

    const serviceDb = createSupabaseServiceRoleClient();
    if (!serviceDb) {
      return jsonResponseWithCookies({ error: "Service unavailable." }, [], { status: 503 });
    }

    const userLookup = await lookupUserByEmail(serviceDb, email);
    if (!userLookup || userLookup.emailConfirmed) {
      return jsonResponseWithCookies({ success: true }, []);
    }

    await recordOtpSent(serviceDb, email);

    await logOtpEvent(serviceDb, {
      email,
      eventType: "otp_sent",
      userId: userLookup.id,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      sessionFingerprint: getSessionFingerprint(request),
      metadata: { source: "signup_ack" },
    });

    return jsonResponseWithCookies({ success: true }, []);
  } catch (err) {
    console.error("[verify-email/ack]", err);
    return jsonResponseWithCookies({ success: true }, []);
  }
}
