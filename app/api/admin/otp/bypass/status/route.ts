/**
 * GET /api/admin/otp/bypass/status
 *
 * REMOVED — Bypass has been permanently disabled.
 * Always returns bypassEligible: false.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    bypassEnabled: false,
    bypassEligible: false,
    bypassActive: false,
    showBanner: false,
  });
}
