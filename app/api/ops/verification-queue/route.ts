/**
 * GET /api/ops/verification-queue — Pending verification documents for supplier_success
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request, {
    requiredRoles: ["admin", "super_admin", "moderator", "supplier_success"],
    requireAdmin2FA: false,
  });

  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "all";

  const statuses = status.split(",").map((value) => value.trim()).filter(Boolean);

  let query = auth.supabase
    .from("supplier_documents")
    .select(
      `
      id,
      document_type,
      storage_path,
      bucket_name,
      verification_status,
      reviewer_notes,
      reviewed_at,
      created_at,
      profile_id,
      company_id,
      companies:company_id(id, name, slug),
      profiles:profile_id(id, full_name, email)
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (statuses.length > 0 && !statuses.includes("all")) {
    query = query.in("verification_status", statuses);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const rows = await Promise.all((data ?? []).map(async (row) => {
    const signed = row.storage_path && row.bucket_name
      ? await auth.supabase.storage.from(row.bucket_name).createSignedUrl(row.storage_path, 300)
      : { data: null };
    return {
      ...row,
      file_url: signed.data?.signedUrl ?? "",
      status: row.verification_status,
    };
  }));

  return NextResponse.json({ success: true, data: rows });
}
