"use client";

import Link from "next/link";
import {
  AlertCircle,
  Loader2,
  MailCheck,
  RefreshCw,
  Shield,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { OtpInput, OTP_LENGTH_EXPORT } from "@/components/auth/OtpInput";
import { cn } from "@/lib/utils";

type EmailVerificationCardProps = {
  email: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
  cooldownSeconds: number;
  expiresInSeconds: number;
  remainingAttempts: number;
  otpSent: boolean;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function EmailVerificationCard({
  email,
  otp,
  onOtpChange,
  onVerify,
  onResend,
  isVerifying,
  isResending,
  error,
  cooldownSeconds,
  expiresInSeconds,
  remainingAttempts,
  otpSent,
}: EmailVerificationCardProps) {
  const canVerify =
    otp.length === OTP_LENGTH_EXPORT &&
    !isVerifying &&
    remainingAttempts > 0 &&
    expiresInSeconds > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 sm:p-6">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
              style={{ background: "#2563EB" }}
            >
              CT
            </span>
            {BRAND.name}
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[14px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(37,99,235,0.08)]">
          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(37, 99, 235, 0.1)" }}
            >
              <MailCheck className="h-8 w-8" style={{ color: "#2563EB" }} />
            </div>
          </div>

          <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
            Verify Your Email Address
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            We&apos;ve sent a 6-digit verification code to:
          </p>
          <p className="mt-1 text-center text-sm font-bold text-slate-900">
            {email}
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!otpSent && !error ? (
            <div className="mt-6 flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
              <p className="text-sm text-slate-500">Sending verification code…</p>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <OtpInput
                  value={otp}
                  onChange={onOtpChange}
                  disabled={isVerifying || remainingAttempts === 0}
                  error={Boolean(error)}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {expiresInSeconds > 0 ? (
                    <>
                      Code expires in{" "}
                      <span
                        className={cn(
                          "font-mono font-bold",
                          expiresInSeconds <= 60 && "text-red-500",
                        )}
                      >
                        {formatCountdown(expiresInSeconds)}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-red-500">
                      Code expired. Request a new one.
                    </span>
                  )}
                </span>
                <span>
                  {remainingAttempts} attempt
                  {remainingAttempts !== 1 ? "s" : ""} left
                </span>
              </div>

              <Button
                type="button"
                onClick={onVerify}
                disabled={!canVerify}
                className="mt-6 h-12 w-full rounded-xl text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-px disabled:opacity-50"
                style={{ background: "#2563EB" }}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify Account"
                )}
              </Button>
            </>
          )}

          {/* Resend */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-600">Didn&apos;t receive the code?</p>
            <button
              type="button"
              onClick={onResend}
              disabled={cooldownSeconds > 0 || isResending || isVerifying}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
                cooldownSeconds > 0 || isResending
                  ? "cursor-not-allowed text-slate-300"
                  : "text-[#2563EB] hover:text-blue-800",
              )}
            >
              {isResending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {cooldownSeconds > 0
                ? `Resend available in: ${cooldownSeconds}s`
                : "Resend Code"}
            </button>
          </div>
        </div>

        {/* Security footer */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="h-3 w-3" />
          Protected by {BRAND.name} Security · Code expires in 10 minutes
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Wrong email?{" "}
          <Link href="/register" className="font-semibold text-[#2563EB] hover:underline">
            Register again
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
