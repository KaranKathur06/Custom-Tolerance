/**
 * GET /api/seller/verification-policy
 *
 * Returns the verification policy for the authenticated seller.
 * Used by onboarding UI to determine which verification channel to show.
 *
 * Response:
 * {
 *   policy: { country, verificationChannel, phoneRequired, emailRequired },
 *   state: { email, phone, gst, bank, missingRequirements, canContinue, completionPercent }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import {
  getSellerVerificationState,
  getVerificationPolicyForCountry,
} from "@/lib/auth/seller-verification-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  // Get the full verification state
  const state = await getSellerVerificationState(auth.supabase, auth.user.id);

  if (!state) {
    // No seller profile yet — return default India policy
    const defaultPolicy = getVerificationPolicyForCountry("India");
    return NextResponse.json({
      success: true,
      data: {
        policy: defaultPolicy,
        state: null,
        message: "No seller profile found. Showing default verification policy.",
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      policy: state.policy,
      state: {
        email: state.email,
        phone: state.phone,
        gst: state.gst,
        bank: state.bank,
        missingRequirements: state.missingRequirements,
        canContinue: state.canContinue,
        completionPercent: state.completionPercent,
      },
    },
  });
}
