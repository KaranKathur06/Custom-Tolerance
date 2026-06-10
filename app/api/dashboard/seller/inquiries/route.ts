/**
 * GET /api/dashboard/seller/inquiries — Incoming inquiries for seller's marketplace supplier
 * PATCH — mark inquiry read
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

async function resolveSupplierId(supabase: SupabaseClient, userId: string) {
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!sellerProfile) return null;

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("seller_profile_id", sellerProfile.id)
    .maybeSingle();

  return supplier?.id ?? null;
}

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const supplierId = await resolveSupplierId(auth.supabase, auth.user.id);
  if (!supplierId) {
    return NextResponse.json({ success: true, data: [] });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const source = searchParams.get("source");

  let query = auth.supabase
    .from("inquiries")
    .select(
      `
      id, subject, message, quantity, timeline, source, status, is_read, created_at,
      listing_id,
      buyer_user_id
    `,
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) query = query.eq("is_read", false);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
      { status: 400 },
    );
  }

  const inquiryId = typeof body.inquiry_id === "string" ? body.inquiry_id : null;
  if (!inquiryId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "inquiry_id required" } },
      { status: 400 },
    );
  }

  const supplierId = await resolveSupplierId(auth.supabase, auth.user.id);
  if (!supplierId) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Not a supplier" } },
      { status: 403 },
    );
  }

  const { data, error } = await auth.supabase
    .from("inquiries")
    .update({ is_read: true, status: "viewed" })
    .eq("id", inquiryId)
    .eq("supplier_id", supplierId)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}
