import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

/** Seller grants contact unlock to a buyer (e.g. after inquiry approval) */
export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const buyerUserId = String(body.buyerUserId ?? "");
  const inquiryId = body.inquiryId ? String(body.inquiryId) : null;
  const unlockedFields = Array.isArray(body.unlockedFields)
    ? body.unlockedFields
    : ["mobile", "email", "whatsapp"];

  if (!buyerUserId) {
    return NextResponse.json({ error: "buyerUserId required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("contact_unlocks")
    .upsert({
      seller_user_id: user.id,
      buyer_user_id: buyerUserId,
      inquiry_id: inquiryId,
      status: "active",
      unlocked_fields: unlockedFields,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    })
    .select("id, status, unlocked_fields, granted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

/** Seller revokes contact unlock */
export async function DELETE(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buyerUserId = request.nextUrl.searchParams.get("buyerUserId");
  if (!buyerUserId) {
    return NextResponse.json({ error: "buyerUserId required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { error } = await supabase
    .from("contact_unlocks")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("seller_user_id", user.id)
    .eq("buyer_user_id", buyerUserId)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
