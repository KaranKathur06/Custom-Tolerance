"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="GST number" required error={errors.gstNumber}>
          <TextInput
            value={String(form.gstNumber || "")}
            onChange={(e) => onFieldChange("gstNumber", e.target.value.toUpperCase())}
            placeholder="24ADUPV1084A2ZF"
            error={Boolean(errors.gstNumber)}
          />
        </Field>
        <Field label="Legal name fallback" error={errors.legalBusinessName}>
          <TextInput
            value={String(form.legalBusinessName || "")}
            onChange={(e) => onFieldChange("legalBusinessName", e.target.value)}
            error={Boolean(errors.legalBusinessName)}
          />
        </Field>
        <div className="flex items-end">
          <div className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Button type="button" onClick={onVerifyGst} disabled={verifyingGst}>
              {verifyingGst ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify GST
            </Button>
            {Boolean(form.gstVerified) ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> GST verified
              </span>
            ) : (
              <span className="text-sm text-slate-500">GST must be verified before activation.</span>
            )}
          </div>
        </div>
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
