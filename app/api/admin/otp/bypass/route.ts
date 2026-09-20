/**
 * POST /api/admin/otp/bypass
 *
 * REMOVED — This endpoint previously allowed a hardcoded email to bypass
 * admin 2FA. It has been permanently disabled as a P0 security remediation.
 *
 * All admin users must now complete real 2FA verification via
 * POST /api/admin/otp/send → POST /api/admin/otp/verify
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "OTP bypass has been permanently removed.",
      code: "BYPASS_REMOVED",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "OTP bypass has been permanently removed.",
      code: "BYPASS_REMOVED",
    },
    { status: 410 },
  );
}
