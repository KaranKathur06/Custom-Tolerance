/**
 * GET  /api/quotes — Seller's submitted quotes
 * POST /api/quotes — Submit a quote on an RFQ
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { evaluateProcurementGate } from "@/lib/marketplace/procurement-gates";
import { evaluateSupplierMarketplaceGate } from "@/lib/marketplace/supplier-marketplace-gates";
import { getServerDevelopmentTrustMode } from "@/lib/marketplace/trust-mode-server";
import { canTransitionQuote } from "@/lib/marketplace/procurement-workflow";
import { createNotification } from "@/lib/marketplace/notifications";
import { ensureProcurementThread, sendThreadMessage } from "@/lib/marketplace/messaging";
import { getSellerV3ActivationContext } from "@/lib/marketplace/onboarding-v3-gates";
import { QuoteService } from "@/lib/domain/services/quote.service";
import { QuoteRepository } from "@/lib/domain/repositories/quote.repository";
import { RfqService } from "@/lib/domain/services/rfq.service";
import { RfqRepository } from "@/lib/domain/repositories/rfq.repository";
import { InMemoryEventBus } from "@/lib/domain/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { data: sellerProfile } = await auth.supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json({ success: true, data: [] });
  }

  const service = new QuoteService(new QuoteRepository(auth.supabase), new InMemoryEventBus());

  try {
    const result = await service.listSellerQuotes(sellerProfile.id, 1, 50);
    return NextResponse.json({ success: true, data: result.data || [] });
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
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
      { status: 400 },
    );
  }

  const rfqId = typeof body.rfq_id === "string" ? body.rfq_id : "";
  if (!rfqId) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "rfq_id is required" } },
      { status: 400 },
    );
  }

  const { data: sellerProfile } = await auth.supabase
    .from("seller_profiles")
    .select("id, trust_level, company_id, profile_completion_percent")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SELLER_PROFILE_REQUIRED", message: "Complete seller onboarding first" },
      },
      { status: 400 },
    );
  }

  const developmentTrustMode = await getServerDevelopmentTrustMode(auth.supabase);
  const sellerV3Context = await getSellerV3ActivationContext(auth.supabase, auth.user.id);
  const { data: company } = sellerProfile.company_id
    ? await auth.supabase
        .from("companies")
        .select("email_verified, phone_verified")
        .eq("id", sellerProfile.company_id)
        .maybeSingle()
    : { data: null };
  const trustLevel = Math.min(
    4,
    Math.max(0, sellerProfile.trust_level ?? 0),
  ) as 0 | 1 | 2 | 3 | 4;

  const gate = evaluateProcurementGate({
    action: "submit_quote",
    role: "seller",
    currentTrustLevel: trustLevel,
    profileCompletionPercent: sellerProfile.profile_completion_percent ?? 0,
    emailVerified: Boolean(auth.user.email_confirmed_at),
    developmentTrustMode,
  });

  if (!gate.allowed && gate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROCUREMENT_GATE", message: gate.message ?? "Quote submission blocked" },
        gate,
      },
      { status: 403 },
    );
  }

  const sellerGate = evaluateSupplierMarketplaceGate({
    action: "respond_rfq",
    onboardingStatus: sellerV3Context.sellerProfile?.onboarding_status ?? "REGISTERED",
    profileCompletionPercent: sellerProfile.profile_completion_percent ?? 0,
    emailVerified: Boolean(auth.user.email_confirmed_at) || Boolean(company?.email_verified),
    mobileVerified: Boolean(company?.phone_verified),
    requiredDocumentsUploaded: sellerV3Context.requiredDocumentsUploaded && sellerV3Context.bankVerified,
    developmentTrustMode,
  });

  if (!sellerGate.allowed && sellerGate.hardBlocked) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SELLER_GATE", message: sellerGate.message },
        gate: sellerGate,
      },
      { status: 403 },
    );
  }

  const rfqService = new RfqService(new RfqRepository(auth.supabase), new InMemoryEventBus());
  const quoteService = new QuoteService(new QuoteRepository(auth.supabase), new InMemoryEventBus());

  try {
    // Get RFQ and validate
    const rfq = await rfqService.getForQuoteSubmission(rfqId);

    if (!rfq || !["open", "in_review", "quoted"].includes(rfq.status)) {
      return NextResponse.json(
        { success: false, error: { code: "RFQ_CLOSED", message: "This RFQ is not accepting quotes" } },
        { status: 400 },
      );
    }

    if (rfq.visibility_level === "premium") {
      const premiumGate = evaluateProcurementGate({
        action: "access_premium_rfq",
        role: "seller",
        currentTrustLevel: trustLevel,
        profileCompletionPercent: sellerProfile.profile_completion_percent ?? 0,
        emailVerified: Boolean(auth.user.email_confirmed_at),
        developmentTrustMode,
      });

      if (!premiumGate.allowed && premiumGate.hardBlocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PROCUREMENT_GATE",
              message: premiumGate.message ?? "Premium RFQ access requires higher trust tier",
            },
            gate: premiumGate,
          },
          { status: 403 },
        );
      }
    }

    // Submit quote via service
    const price = typeof body.price === "string" ? body.price : String(body.price ?? "");
    const data = await quoteService.submitQuote({
      rfqId,
      sellerProfileId: sellerProfile.id,
      companyId: sellerProfile.company_id,
      price,
      currencyCode: typeof body.currency_code === "string" ? body.currency_code : "INR",
      leadTime: typeof body.lead_time === "string" ? body.lead_time : null,
      moq: typeof body.moq === "string" ? body.moq : null,
      message: typeof body.message === "string" ? body.message : null,
      paymentTerms: typeof body.payment_terms === "string" ? body.payment_terms : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      validityDays: typeof body.validity_days === "number" ? body.validity_days : 30,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    });

    // Handle side effects: messaging and notifications (non-blocking)
    let threadId: string | null = null;

    if (rfq?.buyer_profile_id) {
      try {
        const createdThreadId = await ensureProcurementThread(auth.supabase, {
          rfqId,
          buyerProfileId: rfq.buyer_profile_id,
          sellerProfileId: sellerProfile.id,
          quoteId: data.id,
        });
        threadId = createdThreadId;

        const summary = `Quote submitted: ${price}${body.lead_time ? ` · Lead time: ${body.lead_time}` : ""}${body.moq ? ` · MOQ: ${body.moq}` : ""}`;

        const { data: buyer } = await auth.supabase
          .from("buyer_profiles")
          .select("profile_id")
          .eq("id", rfq.buyer_profile_id)
          .maybeSingle();

        await sendThreadMessage(auth.supabase, {
          threadId: createdThreadId,
          senderId: auth.user.id,
          body: (body.message as string)?.trim() || summary,
          notifyProfileId: buyer?.profile_id ?? null,
          notificationTitle: `New quote on ${rfq.title}`,
          notificationHref: rfq.slug ? `/rfq/${rfq.slug}` : `/messages/${threadId}`,
        });

        if (buyer?.profile_id) {
          await auth.supabase.from("notifications").insert(
            createNotification({
              profileId: buyer.profile_id,
              title: `Quote received for ${rfq.title}`,
              body: summary,
              type: "quote",
              href: rfq.slug ? `/rfq/${rfq.slug}` : null,
              metadata: { rfq_id: rfqId, quote_id: data.id },
            }),
          );
        }
      } catch {
        // Non-blocking: quote succeeded even if messaging fails
      }
    }

    return NextResponse.json(
      { success: true, data, threadId, gate: gate.message ? gate : undefined },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}
