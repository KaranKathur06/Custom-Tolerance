/**
 * GET /api/admin/suppliers — List suppliers for admin tools (GST, moderation)
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_SETTINGS],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const search = searchParams.get("search")?.trim();

  let query = auth.supabase
    .from("suppliers")
    .select("id, company_name, slug, state, gstin, gst_verified_at, verification_status", {
      count: "exact",
    })
    .order("company_name", { ascending: true })
    .limit(limit);

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,gstin.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: data ?? [],
    meta: { total: count ?? 0 },
  });
}
