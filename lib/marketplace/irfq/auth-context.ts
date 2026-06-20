import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateProcurementGate } from "../procurement-gates";
import { getBuyerV3GateContext } from "../onboarding-v3-gates";
import { getServerDevelopmentTrustMode } from "../trust-mode-server";
import { resolveUserIrfqPlan } from "./subscription-gates";
import { resolveBuyerProfile, getUserCompanyId } from "./resolve-buyer";

export async function getIrfqAuthContext(supabase: SupabaseClient, userId: string, role: string) {
  const { buyerProfileId } = await resolveBuyerProfile(supabase, userId);
  const companyId = await getUserCompanyId(supabase, userId);
  const buyerGateContext = await getBuyerV3GateContext(supabase, userId);
  const developmentTrustMode = await getServerDevelopmentTrustMode(supabase);
  const trustLevel = Math.min(
    4,
    Math.max(0, buyerGateContext.trustLevel ?? 0),
  ) as 0 | 1 | 2 | 3 | 4;

  const { data: membership } = await supabase
    .from("memberships")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subscriptionPlan = resolveUserIrfqPlan(membership?.plan, trustLevel);

  const publishGate = evaluateProcurementGate({
    action: "publish_rfq",
    role: role === "seller" ? "both" : "buyer",
    currentTrustLevel: trustLevel,
    profileCompletionPercent: buyerGateContext.profileCompletionPercent,
    emailVerified: buyerGateContext.emailVerified,
    mobileVerified: buyerGateContext.mobileVerified,
    developmentTrustMode,
  });

  return {
    buyerProfileId,
    companyId,
    trustLevel,
    subscriptionPlan,
    publishGate,
    buyerGateContext,
    developmentTrustMode,
  };
}
