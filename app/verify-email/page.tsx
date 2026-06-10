"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { EmailVerificationCard } from "@/components/auth/EmailVerificationCard";
import { useEmailVerification } from "@/lib/hooks/useEmailVerification";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim();
  const alreadySent = searchParams.get("sent") === "1";

  const {
    otp,
    setOtp,
    error,
    isVerifying,
    isResending,
    otpSent,
    cooldownSeconds,
    expiresInSeconds,
    remainingAttempts,
    verifyOtp,
    resendOtp,
  } = useEmailVerification({ email, alreadySent });

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900">Email Required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Start registration or login to verify your email address.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register">
              <Button style={{ background: "#2563EB" }} className="text-white">
                Register
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EmailVerificationCard
      email={email}
      otp={otp}
      onOtpChange={setOtp}
      onVerify={() => void verifyOtp()}
      onResend={resendOtp}
      isVerifying={isVerifying}
      isResending={isResending}
      error={error}
      cooldownSeconds={cooldownSeconds}
      expiresInSeconds={expiresInSeconds}
      remainingAttempts={remainingAttempts}
      otpSent={otpSent}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
