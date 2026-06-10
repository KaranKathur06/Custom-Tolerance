/**
 * GET /api/suppliers/[id]/gallery — Public supplier gallery images
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadSupplierGallery } from "@/lib/marketplace/supplier-profile-extended";

type RouteParams = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveSupplierId(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  idOrSlug: string,
): Promise<string | null> {
  if (UUID_RE.test(idOrSlug)) return idOrSlug;

  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("slug", idOrSlug)
    .eq("is_published", true)
    .maybeSingle();

  return data?.id ?? null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Service unavailable" } },
      { status: 503 },
    );
  }

  const supplierId = await resolveSupplierId(supabase, id);
  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 },
    );
  }

  const gallery = await loadSupplierGallery(supabase, supplierId);

  return NextResponse.json({ success: true, data: gallery });
}
