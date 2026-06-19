"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
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
}: StepProps & { onVerifyGst: () => void; verifyingGst: boolean }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
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
      <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
      <Field label="Company name" error={errors.companyName}>
        <TextInput value={String(form.companyName || "")} onChange={(e) => onFieldChange("companyName", e.target.value)} />
      </Field>
      <Field label="Trade name" error={errors.tradeName}>
        <TextInput value={String(form.tradeName || "")} onChange={(e) => onFieldChange("tradeName", e.target.value)} />
      </Field>
      <Field label="State" error={errors.state}>
        <TextInput value={String(form.state || "")} onChange={(e) => onFieldChange("state", e.target.value)} />
      </Field>
      <Field label="City" error={errors.city}>
        <TextInput value={String(form.city || "")} onChange={(e) => onFieldChange("city", e.target.value)} />
      </Field>
      <Field label="Registered address" error={errors.registeredAddress}>
        <Textarea
          value={String(form.registeredAddress || "")}
          onChange={(e) => onFieldChange("registeredAddress", e.target.value)}
          rows={3}
        />
      </Field>
      <Field label="Pincode" error={errors.pincode}>
        <TextInput value={String(form.pincode || "")} onChange={(e) => onFieldChange("pincode", e.target.value)} />
      </Field>
    </div>
  );
}
