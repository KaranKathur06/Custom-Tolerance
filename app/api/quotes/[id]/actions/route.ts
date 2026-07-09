/**
 * POST /api/quotes/[id]/actions — Quote lifecycle: view, shortlist, accept, reject
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { canTransitionQuote, type QuoteStatus } from "@/lib/marketplace/procurement-workflow";
import { createNotification } from "@/lib/marketplace/notifications";
import { QuoteService } from "@/lib/domain/services/quote.service";
import { QuoteRepository } from "@/lib/domain/repositories/quote.repository";
import { InMemoryEventBus } from "@/lib/domain/events";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

type QuoteActionName = "view" | "shortlist" | "accept" | "reject";

const ACTION_PATCH: Record<
  QuoteActionName,
  { workflow: QuoteActionName; patch: Record<string, unknown> }
> = {
  view: { workflow: "view", patch: { viewed_at: new Date().toISOString(), status: "viewed" } },
  shortlist: {
    workflow: "shortlist",
    patch: { shortlisted_at: new Date().toISOString(), status: "shortlisted" },
  },
  accept: { workflow: "accept", patch: { status: "accepted" } },
  reject: { workflow: "reject", patch: { status: "rejected" } },
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id: quoteId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
      { status: 400 },
    );
  }

  const action = body.action as QuoteActionName;
  if (!action || !(action in ACTION_PATCH)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid action" } },
      { status: 400 },
    );
  }

  const quoteService = new QuoteService(new QuoteRepository(auth.supabase), new InMemoryEventBus());

  try {
    const quote = await quoteService.getQuoteWithRfqDetails(quoteId);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Quote not found" } },
        { status: 404 },
      );
    }

    const rfqRaw = quote.rfqs;
    const rfq = (Array.isArray(rfqRaw) ? rfqRaw[0] : rfqRaw) as {
      id: string;
      title: string;
      slug: string | null;
      buyer_profile_id: string | null;
      buyer_user_id: string | null;
    } | null;

    const isAdmin = ["admin", "super_admin", "moderator"].includes(auth.role);

    let isBuyer = rfq?.buyer_user_id === auth.user.id;
    if (!isBuyer && rfq?.buyer_profile_id) {
      const { data: buyerProfile } = await auth.supabase
        .from("buyer_profiles")
        .select("id")
        .eq("id", rfq.buyer_profile_id)
        .eq("profile_id", auth.user.id)
        .maybeSingle();
      isBuyer = Boolean(buyerProfile);
    }

    const buyerOnlyActions: QuoteActionName[] = ["view", "shortlist", "accept", "reject"];
    if (buyerOnlyActions.includes(action) && !isBuyer && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Buyer action only" } },
        { status: 403 },
      );
    }

    const currentStatus = quote.status as QuoteStatus;
    const { workflow, patch } = ACTION_PATCH[action];

    if (!canTransitionQuote(currentStatus, workflow)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_STATE", message: `Cannot ${action} from status ${currentStatus}` },
        },
        { status: 400 },
      );
    }

    // Update via service
    const updated = await quoteService.updateQuoteStatus(quoteId, patch);

    await auth.supabase.from("platform_events").insert({
      event_type: `quote.${action}`,
      actor_id: auth.user.id,
      actor_role: auth.role,
      resource_type: "quote",
      resource_id: quoteId,
      metadata: { rfq_id: quote.rfq_id, action },
    });

    if (quote.seller_profile_id && ["accept", "reject", "shortlist"].includes(action)) {
      const { data: seller } = await auth.supabase
        .from("seller_profiles")
        .select("profile_id")
        .eq("id", quote.seller_profile_id)
        .maybeSingle();

      if (seller?.profile_id) {
        await auth.supabase.from("notifications").insert(
          createNotification({
            profileId: seller.profile_id,
            title: `Quote ${action}ed`,
            body: `Your quote on "${rfq?.title ?? "RFQ"}" was ${action}ed.`,
            type: "quote",
            href: rfq?.slug ? `/rfq/${rfq.slug}` : null,
            metadata: { quote_id: quoteId, action },
          }),
        );
      }
    }

    if (action === "accept" && rfq?.id) {
      await auth.supabase.from("rfqs").update({ status: "closed" }).eq("id", rfq.id);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}
