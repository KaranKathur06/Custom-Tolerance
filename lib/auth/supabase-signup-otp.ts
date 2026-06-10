/**
 * Supabase native signup email OTP delivery.
 * Uses signInWithOtp for resend/send paths; signUp on register sends the initial OTP.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SignupOtpDeliveryResult = {
  error: { message: string } | null;
  /** Which verifyOtp type the client should use after this send */
  verifyType: "signup" | "email";
};

/**
 * Deliver a signup verification OTP via Supabase Auth.
 * Resend/send flows use signInWithOtp (shouldCreateUser: false for existing accounts).
 */
export async function deliverSignupVerificationOtp(
  supabase: SupabaseClient,
  email: string,
  mode: "signin_otp" | "signup_resend" = "signin_otp",
): Promise<SignupOtpDeliveryResult> {
  if (mode === "signup_resend") {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    return { error, verifyType: "signup" };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  return { error, verifyType: "email" };
}

/**
 * Verify signup OTP — tries signup type first (initial signUp email),
 * then email type (signInWithOtp resend path).
 */
export async function verifySignupOtp(
  supabase: SupabaseClient,
  email: string,
  token: string,
) {
  const signupAttempt = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (!signupAttempt.error && signupAttempt.data.session) {
    return signupAttempt;
  }

  return supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
}
