import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * EAGER INITIALIZATION PATTERN
 *
 * Creates a minimal seller_profiles record on first onboarding access.
 * This enables document uploads during the onboarding flow without waiting
 * for full profile submission.
 *
 * Solves: Profile-before-upload deadlock by establishing ownership chain early:
 *   user.id → seller_profiles.id → supplier_documents.seller_profile_id
 *
 * Safe: Idempotent operation; returns existing record if already initialized.
 */

export type SellerProfileInitResult = {
  sellerProfileId: string;
  companyId: string | null;
  isNew: boolean;
};

/**
 * Get or create a seller_profiles record for the user.
 * Idempotent: safe to call multiple times from different endpoints.
 *
 * Used to:
 * - Enable document uploads during onboarding
 * - Establish ownership chain early
 * - Migrate from anonymous to authenticated seller
 */
export async function getOrInitializeSellerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<SellerProfileInitResult> {
  if (!userId) {
    throw new Error("User ID is required to initialize seller profile");
  }

  // Check if seller_profiles record already exists
  const { data: existing, error: existingError } = await supabase
    .from("seller_profiles")
    .select("id, company_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing seller profile: ${existingError.message}`);
  }

  // Return existing record
  if (existing) {
    return {
      sellerProfileId: existing.id,
      companyId: existing.company_id || null,
      isNew: false,
    };
  }

  // Create minimal seller_profiles record for ownership chain
  const { data: created, error: createError } = await supabase
    .from("seller_profiles")
    .insert({
      profile_id: userId,
      company_id: null, // Will be set when company is selected/created
      onboarding_status: "REGISTERED",
      verification_status: "pending",
      profile_completion_percent: 0,
      created_by: userId,
    })
    .select("id, company_id")
    .single();

  if (createError) {
    throw new Error(`Failed to initialize seller profile: ${createError.message}`);
  }

  if (!created) {
    throw new Error("Seller profile creation failed: no result returned");
  }

  return {
    sellerProfileId: created.id,
    companyId: created.company_id || null,
    isNew: true,
  };
}

/**
 * Initialize seller profile during onboarding route if needed.
 * Called on every onboarding request to ensure ownership chain exists.
 *
 * Patterns:
 * - First save: Creates seller_profiles if not exists
 * - Subsequent saves: Returns existing record (idempotent)
 * - Uploads: Can now proceed because seller_profiles exists
 */
export async function ensureSellerProfileExists(
  supabase: SupabaseClient,
  userId: string,
): Promise<SellerProfileInitResult> {
  try {
    return await getOrInitializeSellerProfile(supabase, userId);
  } catch (error) {
    console.error("[seller-profile-init] failed:", error);
    throw error;
  }
}
