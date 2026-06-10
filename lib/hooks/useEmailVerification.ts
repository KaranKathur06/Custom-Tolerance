"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolveAuthRole } from "@/lib/auth/profile-role";
import { getOnboardingHref } from "@/lib/marketplace/auth-navigation";
import { OTP_CONFIG } from "@/lib/auth/verification-security";
import { OTP_LENGTH_EXPORT } from "@/components/auth/OtpInput";

type UseEmailVerificationOptions = {
  email: string;
  /** Skip initial API send when signUp already dispatched the OTP email */
  alreadySent?: boolean;
};

type VerifyApiResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  remainingAttempts?: number;
  cooldownRemaining?: number;
  redirectTo?: string;
};

export function useEmailVerification({
  email,
  alreadySent = false,
}: UseEmailVerificationOptions) {
  const router = useRouter();
  const { supabase, refreshIdentity } = useAuth();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpSent, setOtpSent] = useState(alreadySent);
  const [cooldownSeconds, setCooldownSeconds] = useState(
    alreadySent ? OTP_CONFIG.RESEND_COOLDOWN_SECONDS : 0,
  );
  const [expiresInSeconds, setExpiresInSeconds] = useState(
    OTP_CONFIG.EXPIRY_MINUTES * 60,
  );
  const [remainingAttempts, setRemainingAttempts] = useState<number>(
    OTP_CONFIG.MAX_ATTEMPTS,
  );

  const initialSendRef = useRef(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (expiresInSeconds <= 0) return;
    const timer = setInterval(() => {
      setExpiresInSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresInSeconds]);

  const sendOtp = useCallback(
    async (isResend = false) => {
      if (!email) return;

      if (isResend) {
        setIsResending(true);
      }
      setError(null);

      try {
        const endpoint = isResend
          ? "/api/auth/verify-email/resend"
          : "/api/auth/verify-email/send";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        });

        const data = (await res.json()) as VerifyApiResponse;

        if (!res.ok) {
          if (data.cooldownRemaining) {
            setCooldownSeconds(data.cooldownRemaining);
          }
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
          setError(data.error || "Failed to send verification code.");
          return;
        }

        setOtpSent(true);
        setExpiresInSeconds(OTP_CONFIG.EXPIRY_MINUTES * 60);
        setCooldownSeconds(OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
        setOtp("");
      } catch {
        setError("Unable to send code. Check your connection.");
      } finally {
        setIsResending(false);
      }
    },
    [email],
  );

  useEffect(() => {
    if (alreadySent || !email || initialSendRef.current) return;
    initialSendRef.current = true;
    void sendOtp(false);
  }, [alreadySent, email, sendOtp]);

  const resolvePostVerifyRedirect = useCallback(async () => {
    if (!supabase) return "/onboarding";

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return "/onboarding";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, profile_status, onboarding_step")
      .eq("id", user.id)
      .maybeSingle();

    const role = resolveAuthRole({
      profileRole: profile?.role,
      appMetadataRole: user.app_metadata?.role,
      userMetadataRole: user.user_metadata?.role,
    });

    const onboardingIncomplete =
      profile?.profile_status !== "complete" || (profile?.onboarding_step ?? 1) > 1;

    if (onboardingIncomplete) {
      return getOnboardingHref(role);
    }

    return getOnboardingHref(role);
  }, [supabase]);

  const verifyOtp = useCallback(async () => {
    if (otp.length !== OTP_LENGTH_EXPORT || !email) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
        credentials: "include",
      });

      const data = (await res.json()) as VerifyApiResponse;

      if (!res.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.error || "Verification failed.");
        return;
      }

      await refreshIdentity();
      const destination = data.redirectTo ?? (await resolvePostVerifyRedirect());
      router.push(destination);
      router.refresh();
    } catch {
      setError("Unable to verify. Check your connection.");
    } finally {
      setIsVerifying(false);
    }
  }, [email, otp, refreshIdentity, resolvePostVerifyRedirect, router]);

  const resendOtp = useCallback(() => {
    if (cooldownSeconds > 0) return;
    void sendOtp(true);
  }, [cooldownSeconds, sendOtp]);

  return {
    otp,
    setOtp,
    error,
    setError,
    isVerifying,
    isResending,
    otpSent,
    cooldownSeconds,
    expiresInSeconds,
    remainingAttempts,
    verifyOtp,
    resendOtp,
    sendOtp,
  };
}
