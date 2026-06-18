/**
 * POST /api/inquiries/supplier — Create direct inquiry to a supplier
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set(["profile", "listing", "search", "capability"]);

export async function POST(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  const supplierId = typeof body.supplier_id === "string" ? body.supplier_id : null;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!supplierId || !message) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "supplier_id and message are required" },
      },
      { status: 400 },
    );
  }

  const source =
    typeof body.source === "string" && VALID_SOURCES.has(body.source)
      ? body.source
      : "profile";

  const { data: supplier } = await auth.supabase
    .from("suppliers")
    .select("id, company_name, owner_user_id, slug")
    .eq("id", supplierId)
    .eq("is_published", true)
    .maybeSingle();

  if (!supplier) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Supplier not found" } },
      { status: 404 },
    );
  }

  const { data: inquiry, error } = await auth.supabase
    .from("inquiries")
    .insert({
      buyer_user_id: auth.user.id,
      supplier_id: supplierId,
      listing_id: typeof body.listing_id === "string" ? body.listing_id : null,
      source,
      subject:
        typeof body.subject === "string" && body.subject.trim()
          ? body.subject.trim()
          : `Inquiry for ${supplier.company_name}`,
      message,
      quantity: typeof body.quantity === "string" ? body.quantity.trim() : null,
      timeline: typeof body.timeline === "string" ? body.timeline.trim() : null,
      metadata: {
        buyer_email: auth.user.email,
        source_page: typeof body.source_page === "string" ? body.source_page : null,
      },
    })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await auth.supabase.from("platform_events").insert({
    event_type: "inquiry.created",
    actor_id: auth.user.id,
    actor_role: auth.role,
    resource_type: "inquiry",
    resource_id: inquiry.id,
    metadata: {
      supplier_id: supplierId,
      source,
      supplier_slug: supplier.slug,
    },
  });

  if (supplier.owner_user_id) {
    await auth.supabase.from("notifications").insert({
      profile_id: supplier.owner_user_id,
      type: "new_inquiry",
      title: "New inquiry received",
      body: `You have a new inquiry from a buyer for ${supplier.company_name}.`,
      href: "/seller?tab=inquiries",
      metadata: {
        inquiry_id: inquiry.id,
        supplier_id: supplierId,
      },
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: inquiry,
      href: `/buyer?tab=inquiries`,
    },
    { status: 201 },
  );
}
