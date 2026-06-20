import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveBuyerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ buyerProfileId: string; created: boolean }> {
  const { data: existing } = await supabase
    .from("buyer_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing?.id) {
    return { buyerProfileId: existing.id, created: false };
  }

  const { data: created, error } = await supabase
    .from("buyer_profiles")
    .insert({ profile_id: userId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error("Failed to create buyer profile");
  }

  return { buyerProfileId: created.id, created: true };
}

export async function getUserCompanyId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function assertRfqOwnership(
  supabase: SupabaseClient,
  rfqId: string,
  userId: string,
  isAdmin: boolean,
) {
  const { data: rfq, error } = await supabase
    .from("rfqs")
    .select("id, buyer_user_id, buyer_profile_id, status")
    .eq("id", rfqId)
    .maybeSingle();

  if (error || !rfq) {
    return { ok: false as const, status: 404, message: "RFQ not found" };
  }

  if (isAdmin) {
    return { ok: true as const, rfq };
  }

  if (rfq.buyer_user_id === userId) {
    return { ok: true as const, rfq };
  }

  const { data: buyerProfile } = await supabase
    .from("buyer_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (buyerProfile?.id && rfq.buyer_profile_id === buyerProfile.id) {
    return { ok: true as const, rfq };
  }

  return { ok: false as const, status: 403, message: "Not authorized for this RFQ" };
}
