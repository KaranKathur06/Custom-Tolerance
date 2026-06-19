import type { SupabaseClient, User } from "@supabase/supabase-js";
import { generateOTP, getOTPExpiry, hashOTP, verifyOTPHash } from "@/lib/auth/otp";
import { isWhatsAppEnabled, sendWhatsAppTemplate } from "@/lib/services/whatsapp-client";

export const MOBILE_OTP_LENGTH = 6;
export const MOBILE_OTP_EXPIRY_MINUTES = 5;
export const MOBILE_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const MOBILE_OTP_MAX_RESENDS_PER_DAY = 5;
export const MOBILE_OTP_MAX_ATTEMPTS = 5;
export const MOBILE_OTP_LOCKOUT_MINUTES = 30;

export type MobileVerificationStatus =
  | "pending"
  | "otp_sent"
  | "verified"
  | "failed";

export type NormalizedMobile = {
  countryCode: string;
  mobileNumber: string;
  e164: string;
};

export type MobileVerificationRecord = {
  id: string;
  user_id: string;
  country_code: string;
  mobile_number: string;
  otp_hash: string | null;
  otp_expires_at: string | null;
  attempt_count: number;
  verified: boolean;
  verified_at: string | null;
  resend_count: number;
  resend_window_started_at: string | null;
  locked_until: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeMobileNumber(rawPhone: string, rawCountryCode = "+91"): NormalizedMobile | null {
  const countryDigits = rawCountryCode.replace(/\D/g, "") || "91";
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const normalizedPhone =
    countryDigits === "91" && phoneDigits.startsWith("91") && phoneDigits.length === 12
      ? phoneDigits.slice(2)
      : phoneDigits;

  if (normalizedPhone.length < 7 || normalizedPhone.length > 15) return null;
  if (countryDigits === "91" && normalizedPhone.length !== 10) return null;

  return {
    countryCode: `+${countryDigits}`,
    mobileNumber: normalizedPhone,
    e164: `+${countryDigits}${normalizedPhone}`,
  };
}

export function maskMobile(input: NormalizedMobile | null): string {
  if (!input) return "";
  const visible = input.mobileNumber.slice(-4);
  return `${input.countryCode} ******${visible}`;
}

export function deriveMobileVerificationStatus(
  record: MobileVerificationRecord | null,
): MobileVerificationStatus {
  if (!record) return "pending";
  if (record.verified && record.verified_at) return "verified";
  if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) return "failed";
  if (record.otp_hash && record.otp_expires_at && new Date(record.otp_expires_at).getTime() > Date.now()) {
    return "otp_sent";
  }
  return "pending";
}

export function secondsUntil(timestamp: string | null): number {
  if (!timestamp) return 0;
  return Math.max(0, Math.ceil((new Date(timestamp).getTime() - Date.now()) / 1000));
}

export async function getMobileVerificationRecord(
  supabase: SupabaseClient,
  userId: string,
  mobile: NormalizedMobile,
): Promise<MobileVerificationRecord | null> {
  const { data, error } = await supabase
    .from("mobile_verifications")
    .select("*")
    .eq("user_id", userId)
    .eq("country_code", mobile.countryCode)
    .eq("mobile_number", mobile.mobileNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as MobileVerificationRecord | null) ?? null;
}

export async function createOrUpdateMobileOtp({
  supabase,
  user,
  mobile,
  request,
}: {
  supabase: SupabaseClient;
  user: User;
  mobile: NormalizedMobile;
  request: Request;
}) {
  const now = new Date();
  const existing = await getMobileVerificationRecord(supabase, user.id, mobile);
  const windowStarted = existing?.resend_window_started_at
    ? new Date(existing.resend_window_started_at)
    : now;
  const windowExpired = now.getTime() - windowStarted.getTime() >= 24 * 60 * 60 * 1000;
  const resendCount = windowExpired ? 0 : existing?.resend_count ?? 0;

  if (resendCount >= MOBILE_OTP_MAX_RESENDS_PER_DAY) {
    return {
      ok: false as const,
      status: 429,
      error: "Too many OTP requests. Please try again after 24 hours.",
      code: "RESEND_LIMIT_EXCEEDED",
    };
  }

  if (
    existing?.otp_expires_at &&
    secondsUntil(existing.otp_expires_at) > MOBILE_OTP_EXPIRY_MINUTES * 60 - MOBILE_OTP_RESEND_COOLDOWN_SECONDS
  ) {
    return {
      ok: false as const,
      status: 429,
      error: "Please wait before requesting another OTP.",
      code: "COOLDOWN_ACTIVE",
      retryAfterSeconds: MOBILE_OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  const otp = generateOTP(MOBILE_OTP_LENGTH);
  const payload = {
    user_id: user.id,
    country_code: mobile.countryCode,
    mobile_number: mobile.mobileNumber,
    otp_hash: hashOTP(otp),
    otp_expires_at: getOTPExpiry(MOBILE_OTP_EXPIRY_MINUTES).toISOString(),
    attempt_count: 0,
    verified: false,
    verified_at: null,
    resend_count: resendCount + 1,
    resend_window_started_at: windowExpired
      ? now.toISOString()
      : (existing?.resend_window_started_at ?? now.toISOString()),
    locked_until: null,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    user_agent: request.headers.get("user-agent") || null,
  };

  const { data, error } = await supabase
    .from("mobile_verifications")
    .upsert(payload, { onConflict: "user_id,country_code,mobile_number" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const delivery = await deliverMobileOtp(mobile.e164, otp);
  return {
    ok: true as const,
    record: data as MobileVerificationRecord,
    delivery,
    developmentOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

export async function verifyMobileOtp({
  supabase,
  userId,
  mobile,
  otp,
}: {
  supabase: SupabaseClient;
  userId: string;
  mobile: NormalizedMobile;
  otp: string;
}) {
  const record = await getMobileVerificationRecord(supabase, userId, mobile);
  if (!record?.otp_hash || !record.otp_expires_at) {
    return { ok: false as const, status: 400, code: "NO_OTP", error: "No pending OTP found. Please request a new OTP." };
  }

  if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
    return {
      ok: false as const,
      status: 429,
      code: "ATTEMPT_LOCKED",
      error: "Too many incorrect attempts. Please try again after 30 minutes.",
    };
  }

  if (new Date(record.otp_expires_at).getTime() <= Date.now()) {
    return { ok: false as const, status: 400, code: "OTP_EXPIRED", error: "OTP expired. Please request a new OTP." };
  }

  if (record.attempt_count >= MOBILE_OTP_MAX_ATTEMPTS) {
    return {
      ok: false as const,
      status: 429,
      code: "ATTEMPT_LIMIT_EXCEEDED",
      error: "Too many incorrect attempts. Please try again after 30 minutes.",
    };
  }

  if (!verifyOTPHash(otp, record.otp_hash)) {
    const nextAttempts = record.attempt_count + 1;
    const lockedUntil =
      nextAttempts >= MOBILE_OTP_MAX_ATTEMPTS
        ? new Date(Date.now() + MOBILE_OTP_LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;

    await supabase
      .from("mobile_verifications")
      .update({ attempt_count: nextAttempts, locked_until: lockedUntil })
      .eq("id", record.id);

    return {
      ok: false as const,
      status: nextAttempts >= MOBILE_OTP_MAX_ATTEMPTS ? 429 : 401,
      code: "INVALID_OTP",
      error:
        nextAttempts >= MOBILE_OTP_MAX_ATTEMPTS
          ? "Too many incorrect attempts. Please try again after 30 minutes."
          : `Invalid OTP. ${MOBILE_OTP_MAX_ATTEMPTS - nextAttempts} attempts remaining.`,
    };
  }

  const { data, error } = await supabase
    .from("mobile_verifications")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      otp_hash: null,
      otp_expires_at: null,
      attempt_count: 0,
      locked_until: null,
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { ok: true as const, record: data as MobileVerificationRecord };
}

export async function resetMobileVerification({
  supabase,
  userId,
  mobile,
}: {
  supabase: SupabaseClient;
  userId: string;
  mobile: NormalizedMobile;
}) {
  await supabase
    .from("mobile_verifications")
    .update({
      otp_hash: null,
      otp_expires_at: null,
      attempt_count: 0,
      verified: false,
      verified_at: null,
      locked_until: null,
    })
    .eq("user_id", userId)
    .eq("country_code", mobile.countryCode)
    .eq("mobile_number", mobile.mobileNumber);
}

async function deliverMobileOtp(to: string, otp: string): Promise<"whatsapp" | "development"> {
  if (isWhatsAppEnabled()) {
    await sendWhatsAppTemplate({
      to,
      templateName: process.env.WHATSAPP_MOBILE_OTP_TEMPLATE ?? "customtolerance_mobile_otp",
      params: { otp, ttl: `${MOBILE_OTP_EXPIRY_MINUTES} minutes` },
    });
    return "whatsapp";
  }

  return "development";
}
