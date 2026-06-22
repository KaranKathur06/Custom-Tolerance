import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { getIrfqAuthContext } from "@/lib/marketplace/irfq/auth-context";
import { loadIrfqSubscriptionSnapshot } from "@/lib/marketplace/irfq/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const ctx = await getIrfqAuthContext(auth.supabase, auth.user.id, auth.role);
  const snapshot = await loadIrfqSubscriptionSnapshot(
    auth.supabase,
    auth.user.id,
    ctx.trustLevel,
  );

  return NextResponse.json({ success: true, data: snapshot });
}
