import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUYER_PRIVACY_DEFAULTS,
  BUYER_PRIVACY_FIELD_LABELS,
  SELLER_PRIVACY_DEFAULTS,
  SELLER_PRIVACY_FIELD_LABELS,
  type BuyerPrivacyFieldKey,
  type ProfileVisibilityLevel,
  type SellerPrivacyFieldKey,
  mergePrivacyWithDefaults,
} from "./profile-visibility";

export async function loadProfilePrivacySettings(
  supabase: SupabaseClient,
  userId: string,
  role: "seller" | "buyer",
): Promise<Record<string, ProfileVisibilityLevel>> {
  const { data } = await supabase
    .from("profile_privacy_settings")
    .select("field_key, visibility")
    .eq("user_id", userId)
    .eq("role", role);

  const stored: Record<string, ProfileVisibilityLevel> = {};
  for (const row of data ?? []) {
    stored[row.field_key] = row.visibility as ProfileVisibilityLevel;
  }

  return mergePrivacyWithDefaults(role, stored);
}

export async function saveProfilePrivacySettings(
  supabase: SupabaseClient,
  userId: string,
  role: "seller" | "buyer",
  settings: Record<string, ProfileVisibilityLevel>,
): Promise<void> {
  const rows = Object.entries(settings).map(([field_key, visibility]) => ({
    user_id: userId,
    role,
    field_key,
    visibility,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("profile_privacy_settings").upsert(rows, {
    onConflict: "user_id,role,field_key",
  });

  if (error) throw new Error(`Failed to save privacy settings: ${error.message}`);
}

export function privacyFromOnboardingForm(
  role: "seller" | "buyer",
  form: Record<string, unknown>,
): Record<string, ProfileVisibilityLevel> {
  const defaults = mergePrivacyWithDefaults(role);
  const result = { ...defaults };

  for (const key of Object.keys(defaults)) {
    const visibilityKey = `${key}Visibility`;
    const value = form[visibilityKey];
    if (value === "PUBLIC" || value === "MEMBERS_ONLY" || value === "PRIVATE") {
      result[key] = value;
    }
  }

  return result;
}

export function privacyLabelsForRole(role: "seller" | "buyer"): Record<string, string> {
  return role === "seller" ? SELLER_PRIVACY_FIELD_LABELS : BUYER_PRIVACY_FIELD_LABELS;
}

export function sellerPrivacyKeys(): SellerPrivacyFieldKey[] {
  return Object.keys(SELLER_PRIVACY_DEFAULTS) as SellerPrivacyFieldKey[];
}

export function buyerPrivacyKeys(): BuyerPrivacyFieldKey[] {
  return Object.keys(BUYER_PRIVACY_DEFAULTS) as BuyerPrivacyFieldKey[];
}

export async function hasContactUnlock(
  supabase: SupabaseClient,
  sellerUserId: string,
  buyerUserId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("contact_unlocks")
    .select("id")
    .eq("seller_user_id", sellerUserId)
    .eq("buyer_user_id", buyerUserId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(data);
}
