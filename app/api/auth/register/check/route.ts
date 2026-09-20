/**
 * POST /api/auth/register/check — Pre-registration account lifecycle check.
 *
 * Checks if the email/phone belongs to a deleted or banned account
 * BEFORE the client calls supabase.auth.signUp().
 *
 * This is a server-side gate that prevents re-registration of deleted accounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { canRegisterEmail, canRegisterPhone } from "@/lib/auth/user-lifecycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!email && !phone) {
      return NextResponse.json(
        { allowed: false, error: "Email or phone is required" },
        { status: 400 },
      );
    }

    // Check email
    if (email) {
      const emailCheck = await canRegisterEmail(email);
      if (!emailCheck.allowed) {
        return NextResponse.json(
          { allowed: false, error: emailCheck.reason, code: emailCheck.code },
          { status: 403 },
        );
      }
    }

    // Check phone
    if (phone) {
      const phoneCheck = await canRegisterPhone(phone);
      if (!phoneCheck.allowed) {
        return NextResponse.json(
          { allowed: false, error: phoneCheck.reason, code: phoneCheck.code },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ allowed: true });
  } catch (err: unknown) {
    console.error("[Register Check] Error:", err);
    // Fail open in error cases — let Supabase Auth handle downstream
    return NextResponse.json({ allowed: true });
  }
}
