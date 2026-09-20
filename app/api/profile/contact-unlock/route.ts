import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

/** Seller grants contact unlock to a buyer (e.g. after inquiry approval) */
export async function POST(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const body = await request.json();
  const buyerUserId = String(body.buyerUserId ?? "");
  const inquiryId = body.inquiryId ? String(body.inquiryId) : null;
  const unlockedFields = Array.isArray(body.unlockedFields)
    ? body.unlockedFields
    : ["mobile", "email", "whatsapp"];

  if (!buyerUserId) {
    return NextResponse.json({ error: "buyerUserId required" }, { status: 400 });
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
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const buyerUserId = request.nextUrl.searchParams.get("buyerUserId");
  if (!buyerUserId) {
    return NextResponse.json({ error: "buyerUserId required" }, { status: 400 });
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
