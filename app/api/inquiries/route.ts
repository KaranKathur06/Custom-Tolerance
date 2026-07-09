/**
 * Metal Hub — Inquiries / RFQs API
 * GET  /api/inquiries → List user's RFQs
 * POST /api/inquiries → Create an RFQ (marketplace-normalized)
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { evaluateProcurementGate } from "@/lib/marketplace/procurement-gates";
import { getServerDevelopmentTrustMode } from "@/lib/marketplace/trust-mode-server";
import { getBuyerV3GateContext } from "@/lib/marketplace/onboarding-v3-gates";
import { InMemoryEventBus } from "@/lib/domain/events";
import { RfqRepository } from "@/lib/domain/repositories/rfq.repository";
import { RfqService } from "@/lib/domain/services/rfq.service";
import { ensureUniqueSlug } from "@/lib/marketplace/slug";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);

  const service = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());

  if (isAdmin) {
    try {
      const { data, count } = await service.listByStatus(null, page, limit);
      return NextResponse.json({
        success: true,
        data,
        meta: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
        { status: 500 },
      );
    }
  }

  const { data: buyerProfile } = await auth.supabase
    .from("buyer_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  try {
    const { data, count } = await service.listByBuyer(buyerProfile?.id || null, auth.user.id, page, limit);
    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}

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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "title is required" } },
      { status: 400 },
    );
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("trust_level, profile_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  const buyerGateContext = await getBuyerV3GateContext(auth.supabase, auth.user.id);
  const buyerProfile = buyerGateContext.buyerProfile;

  const developmentTrustMode = await getServerDevelopmentTrustMode(auth.supabase);
  const trustLevel = Math.min(4, Math.max(0, buyerGateContext.trustLevel ?? profile?.trust_level ?? 0)) as 0 | 1 | 2 | 3 | 4;

  const gate = evaluateProcurementGate({
    action: "publish_rfq",
    role: auth.role === "seller" ? "both" : "buyer",
    currentTrustLevel: trustLevel,
    profileCompletionPercent: buyerGateContext.profileCompletionPercent,
    emailVerified: Boolean(auth.user.email_confirmed_at) || buyerGateContext.emailVerified,
    mobileVerified: buyerGateContext.mobileVerified,
    developmentTrustMode,
  });

  if (!gate.allowed && gate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCUREMENT_GATE", message: gate.message ?? "RFQ publishing not allowed" },
        gate,
      },
      { status: 403 },
    );
  }

  let buyerProfileId = buyerProfile?.id;

  if (!buyerProfileId) {
    const { data: created, error: createErr } = await auth.supabase
      .from("buyer_profiles")
      .insert({ profile_id: auth.user.id })
      .select("id")
      .single();

    if (createErr || !created) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: "Failed to create buyer profile" } },
        { status: 500 },
      );
    }
    buyerProfileId = created.id;
  }

  const { data: company } = await auth.supabase
    .from("companies")
    .select("id")
    .eq("owner_id", auth.user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  try {
    const slug = await ensureUniqueSlug(title, async (candidate) => {
      const { data } = await auth.supabase.from("rfqs").select("id").eq("slug", candidate).maybeSingle();
      return Boolean(data);
    });

    const rfqService = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());
    const rfq = await rfqService.create({
      buyerProfileId,
      buyerUserId: auth.user.id,
      title,
      description: typeof body.description === "string" ? body.description : null,
      quantity: typeof body.quantity === "string" ? body.quantity : null,
      unit: typeof body.unit === "string" ? body.unit : "MT",
      budgetMin: typeof body.budget_min === "number" ? body.budget_min : null,
      budgetMax: typeof body.budget_max === "number" ? body.budget_max : null,
      deliveryLocation: typeof body.delivery_location === "string" ? body.delivery_location : null,
      deliveryState: typeof body.delivery_state === "string" ? body.delivery_state : null,
      deliveryCity: typeof body.delivery_city === "string" ? body.delivery_city : null,
      deliveryDate: typeof body.delivery_date === "string" ? body.delivery_date : null,
      deliveryTimeline: typeof body.delivery_timeline === "string" ? body.delivery_timeline : null,
      qualitySpecs: typeof body.quality_specs === "string" ? body.quality_specs : null,
      taxonomyId: typeof body.category_id === "string" ? body.category_id : null,
      industryId: typeof body.industry_id === "string" ? body.industry_id : null,
      capabilityId: typeof body.capability_id === "string" ? body.capability_id : null,
      materialGrade: typeof body.material_grade === "string" ? body.material_grade : null,
      manufacturingProcess:
        typeof body.manufacturing_process === "string" ? body.manufacturing_process : null,
      frequency:
        typeof body.frequency === "string" &&
        ["one_time", "monthly", "quarterly", "annual"].includes(body.frequency)
          ? (body.frequency as "one_time" | "monthly" | "quarterly" | "annual")
          : "one_time",
      moqRequired: body.moq_required === true,
      guestToken: typeof body.guest_token === "string" ? body.guest_token : null,
      companyId: company?.id ?? null,
      slug,
    });

    return NextResponse.json(
      {
        success: true,
        data: rfq,
        gate: gate.message ? gate : undefined,
        href: `/rfq/${rfq.slug}`,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create RFQ";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
