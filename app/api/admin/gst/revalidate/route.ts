/**
 * POST /api/admin/gst/revalidate — Quarterly GST revalidation (gated external API)
 * GET  /api/admin/gst/revalidate — List verifications due for revalidation
 */

import { NextResponse } from "next/server";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { isGstApiEnabled, lookupGstin } from "@/lib/services/gst-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_SETTINGS],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabase
    .from("gst_verifications")
    .select(
      `
      id, gstin, legal_name, gst_state, status, verified_at, next_revalidation_at,
      suppliers:supplier_id(id, company_name, slug, state, gst_verified_at)
    `,
    )
    .eq("is_current", true)
    .order("next_revalidation_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [], gstApiEnabled: isGstApiEnabled() });
}

export async function POST(request: Request) {
  const auth = await protectApiRoute(request, {
    permissions: [PERMISSIONS.ADMIN_SETTINGS],
    requireAdmin2FA: true,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!isGstApiEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_CONFIGURED",
          message: "GST revalidation requires GST_API_KEY and NEXT_PUBLIC_ENABLE_GST_API=true",
        },
      },
      { status: 503 },
    );
  }

  const { data: due } = await auth.supabase
    .from("gst_verifications")
    .select("id, supplier_id, gstin")
    .eq("is_current", true)
    .lte("next_revalidation_at", new Date().toISOString())
    .limit(50);

  const results: Array<{ supplierId: string; gstin: string; status: string }> = [];

  for (const row of due ?? []) {
    try {
      const lookup = await lookupGstin(row.gstin);
      const active = lookup.status === "active";

      await auth.supabase
        .from("suppliers")
        .update({
          gst_status: lookup.status,
          gst_verified_at: active ? new Date().toISOString() : null,
        })
        .eq("id", row.supplier_id);

      if (!active) {
        await auth.supabase
          .from("suppliers")
          .update({ verification_status: "pending" })
          .eq("id", row.supplier_id);
      }

      await auth.supabase
        .from("gst_verifications")
        .update({
          status: lookup.status,
          next_revalidation_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", row.id);

      results.push({ supplierId: row.supplier_id, gstin: row.gstin, status: lookup.status });
    } catch {
      results.push({ supplierId: row.supplier_id, gstin: row.gstin, status: "error" });
    }
  }

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: "gst_revalidation_batch",
    resource: "gst_verifications",
    details: { processed: results.length },
    severity: "info",
    request,
  });

  return NextResponse.json({ success: true, data: { processed: results.length, results } });
}
