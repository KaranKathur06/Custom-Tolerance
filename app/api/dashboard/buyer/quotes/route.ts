/**
 * GET /api/dashboard/buyer/quotes — Active quotes on buyer's RFQs
 */

import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { QuoteService } from "@/lib/domain/services/quote.service";
import { QuoteRepository } from "@/lib/domain/repositories/quote.repository";
import { InMemoryEventBus } from "@/lib/domain/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const rfqId = searchParams.get("rfq_id");

  const { data: buyerProfile } = await auth.supabase
    .from("buyer_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  const quoteService = new QuoteService(new QuoteRepository(auth.supabase), new InMemoryEventBus());

  try {
    const { rfqs, grouped } = await quoteService.getBuyerQuotesGrouped(
      buyerProfile?.id ?? null,
      auth.user.id,
    );

    // Filter by specific RFQ if requested
    if (rfqId) {
      const filtered = grouped.filter((item) => item.rfq.id === rfqId);
      return NextResponse.json({ success: true, data: filtered });
    }

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}
