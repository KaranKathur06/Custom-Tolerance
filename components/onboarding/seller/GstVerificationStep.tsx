"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import type { StepProps } from "./types";

export function GstVerificationStep({
  form,
  errors,
  onFieldChange,
  onVerifyGst,
  verifyingGst,
  gstError,
  onRetryGst,
}: StepProps & {
  onVerifyGst: () => void;
  verifyingGst: boolean;
  gstError?: string | null;
  onRetryGst?: () => void;
}) {
  const isVerified = Boolean(form.gstVerified);

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-slate-600">Verify business identity before marketplace activation.</p>

      {gstError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1 text-sm text-red-800">
              <p className="font-semibold">GST API Error</p>
              <p className="mt-1">
                Unable to verify GST right now. Please try again in a few minutes. If the issue persists, contact support.
              </p>
              {onRetryGst ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={onRetryGst}
                  disabled={verifyingGst}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Retry Verification
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* GST inline verify — Stripe / Razorpay style */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              GST number *
            </span>
            {isVerified ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-slate-900">{String(form.gstNumber || "")}</p>
                  <p className="text-xs font-medium text-emerald-700">GST verified successfully</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  Verified
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  "flex overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-600/20",
                  errors.gstNumber ? "border-red-300 focus-within:ring-red-200" : "border-slate-200",
                )}
              >
                <input
                  value={String(form.gstNumber || "")}
                  onChange={(e) => onFieldChange("gstNumber", e.target.value.toUpperCase())}
                  placeholder="24ADUPV1084A2ZF"
                  className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm font-mono text-slate-900 outline-none placeholder:text-slate-400"
                  aria-invalid={Boolean(errors.gstNumber)}
                />
                <button
                  type="button"
                  onClick={onVerifyGst}
                  disabled={verifyingGst || !String(form.gstNumber || "").trim()}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-l border-slate-200 px-5 text-sm font-semibold transition-all",
                    "bg-slate-950 text-white hover:bg-slate-800",
                    "disabled:pointer-events-none disabled:opacity-45",
                    "active:scale-[0.98]",
                  )}
                >
                  {verifyingGst ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {verifyingGst ? "Verifying…" : "Verify GST"}
                </button>
              </div>
            )}
            {errors.gstNumber ? (
              <span className="mt-1.5 block text-xs font-semibold text-red-600">{errors.gstNumber}</span>
            ) : !isVerified ? (
              <span className="mt-1.5 block text-xs text-slate-500">
                Enter your 15-character GSTIN and verify before continuing.
              </span>
            ) : null}
          </label>
        </div>

        <Field label="Legal name fallback" error={errors.legalBusinessName}>
          <TextInput
            value={String(form.legalBusinessName || "")}
            onChange={(e) => onFieldChange("legalBusinessName", e.target.value)}
            error={Boolean(errors.legalBusinessName)}
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Company name" error={errors.companyName}>
          <TextInput value={String(form.companyName || "")} onChange={(e) => onFieldChange("companyName", e.target.value)} />
        </Field>
        <Field label="Trade name" error={errors.tradeName}>
          <TextInput value={String(form.tradeName || "")} onChange={(e) => onFieldChange("tradeName", e.target.value)} />
        </Field>
        <Field label="State" error={errors.state}>
          <TextInput value={String(form.state || "")} onChange={(e) => onFieldChange("state", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="City" error={errors.city}>
          <TextInput value={String(form.city || "")} onChange={(e) => onFieldChange("city", e.target.value)} />
        </Field>
        <Field label="Pincode" error={errors.pincode}>
          <TextInput value={String(form.pincode || "")} onChange={(e) => onFieldChange("pincode", e.target.value)} />
        </Field>
      </div>

      <Field label="Registered address" error={errors.registeredAddress}>
        <Textarea
          value={String(form.registeredAddress || "")}
          onChange={(e) => onFieldChange("registeredAddress", e.target.value)}
          rows={3}
        />
      </Field>
    </div>
  );
}
