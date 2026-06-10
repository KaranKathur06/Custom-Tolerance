import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getOpsAdminDashboardMetrics } from "@/lib/ops/supabase-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_DASHBOARD],
    requireAdmin2FA: true,
  });

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const metrics = await getOpsAdminDashboardMetrics(auth.supabase);
  return NextResponse.json(metrics);
}
