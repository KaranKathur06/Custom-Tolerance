"use client";

import type { ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { PrivacyVisibilitySelect } from "@/components/onboarding/PrivacyVisibilitySelect";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";
import type { StepProps } from "./types";

export function BasicInformationStep({
  form,
  errors,
  onFieldChange,
  mobileSection,
}: StepProps & { mobileSection: ReactNode }) {
  const emailVisibility = (form.emailVisibility as ProfileVisibilityLevel) ?? "MEMBERS_ONLY";
  const factoryAddressVisibility = (form.factoryAddressVisibility as ProfileVisibilityLevel) ?? "MEMBERS_ONLY";
  const mobileVisibility = (form.mobileVisibility as ProfileVisibilityLevel) ?? "PRIVATE";

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-slate-600">Confirm contact details, email verification, mobile verification, and factory address.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Contact person" required error={errors.contactPersonName}>
          <TextInput
            value={String(form.contactPersonName || "")}
            onChange={(e) => onFieldChange("contactPersonName", e.target.value)}
            error={Boolean(errors.contactPersonName)}
          />
        </Field>
        <Field label="Designation" required error={errors.designation}>
          <TextInput
            value={String(form.designation || "")}
            onChange={(e) => onFieldChange("designation", e.target.value)}
            error={Boolean(errors.designation)}
          />
        </Field>
        <div>
          <Field label="Business email" required error={errors.businessEmail}>
            <TextInput
              value={String(form.businessEmail || "")}
              onChange={(e) => onFieldChange("businessEmail", e.target.value)}
              error={Boolean(errors.businessEmail)}
            />
          </Field>
          <PrivacyVisibilitySelect
            className="mt-2"
            value={emailVisibility}
            onChange={(v) => onFieldChange("emailVisibility", v)}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {mobileSection}
          <PrivacyVisibilitySelect
            className="mt-2"
            value={mobileVisibility}
            onChange={(v) => onFieldChange("mobileVisibility", v)}
          />
        </div>
      </div>

      <div>
        <Field label="Factory address" required error={errors.factoryAddress}>
          <Textarea
            value={String(form.factoryAddress || "")}
            onChange={(e) => onFieldChange("factoryAddress", e.target.value)}
            rows={3}
            className={errors.factoryAddress ? "border-red-300" : ""}
          />
        </Field>
        <PrivacyVisibilitySelect
          className="mt-2"
          value={factoryAddressVisibility}
          onChange={(v) => onFieldChange("factoryAddressVisibility", v)}
        />
      </div>

      <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(form.factorySameAsRegistered)}
          onChange={(e) => {
            onFieldChange("factorySameAsRegistered", e.target.checked);
            if (e.target.checked) onFieldChange("factoryAddress", String(form.registeredAddress || ""));
          }}
        />
        Factory address same as registered address
      </label>
    </div>
  );
}
