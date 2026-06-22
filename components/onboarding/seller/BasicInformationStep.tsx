"use client";

import type { ReactNode } from "react";
import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { PrivacyVisibilitySelect } from "@/components/onboarding/PrivacyVisibilitySelect";
import { StructuredAddressFields } from "./StructuredAddressFields";
import { getCountryCallingCode } from "@/lib/location/country-state-city-provider";
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
  const whatsappVisibility = (form.whatsappVisibility as ProfileVisibilityLevel) ?? "PRIVATE";
  const websiteVisibility = (form.websiteVisibility as ProfileVisibilityLevel) ?? "PUBLIC";
  const linkedinVisibility = (form.linkedinVisibility as ProfileVisibilityLevel) ?? "PUBLIC";

  const factorySameAsRegistered = Boolean(form.factorySameAsRegistered);
  const countryOrigin = String(form.countryOrigin ?? "");

  const callingCode = getCountryCallingCode(countryOrigin);
  const whatsappPlaceholder = callingCode ? `${callingCode} XXX XXX XXXX` : "+91 XXXXX XXXXX";

  const handleFactorySameToggle = (checked: boolean) => {
    onFieldChange("factorySameAsRegistered", checked);
    if (checked) {
      // Auto-fill factory address from registered address
      onFieldChange("factoryAddressLine1", String(form.addressLine1 ?? ""));
      onFieldChange("factoryAddressLine2", String(form.addressLine2 ?? ""));
      onFieldChange("factoryCity", String(form.city ?? ""));
      onFieldChange("factoryState", String(form.state ?? ""));
      onFieldChange("factoryPostalCode", String(form.postalCode ?? ""));
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-slate-600">Confirm contact details, email verification, mobile verification, and factory address.</p>

      {/* Contact Details */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Contact Person" required error={errors.contactPersonName}>
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
          <Field label="Business Email" required error={errors.businessEmail}>
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

      {/* Mobile Verification */}
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

      {/* Additional Contact Fields */}
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Field label="Website" error={errors.website}>
              <TextInput
                value={String(form.website || "")}
                onChange={(e) => onFieldChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </Field>
            <PrivacyVisibilitySelect
              className="mt-2"
              value={websiteVisibility}
              onChange={(v) => onFieldChange("websiteVisibility", v)}
            />
          </div>
          <div>
            <Field label="LinkedIn" error={errors.linkedinUrl}>
              <TextInput
                value={String(form.linkedinUrl || "")}
                onChange={(e) => onFieldChange("linkedinUrl", e.target.value)}
                placeholder="LinkedIn profile URL"
              />
            </Field>
            <PrivacyVisibilitySelect
              className="mt-2"
              value={linkedinVisibility}
              onChange={(v) => onFieldChange("linkedinVisibility", v)}
            />
          </div>
          <div>
            <Field label="WhatsApp" error={errors.whatsapp}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600">
                  {callingCode || "+91"}
                </span>
                <TextInput
                  value={String(form.whatsapp || "")}
                  onChange={(e) => onFieldChange("whatsapp", e.target.value)}
                  placeholder={whatsappPlaceholder}
                  className="flex-1"
                />
              </div>
            </Field>
            <PrivacyVisibilitySelect
              className="mt-2"
              value={whatsappVisibility}
              onChange={(v) => onFieldChange("whatsappVisibility", v)}
            />
          </div>
        </div>
      </div>

      {/* Factory Address — checkbox ABOVE */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Factory Address</h3>
        </div>

        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 transition-colors">
          <input
            type="checkbox"
            checked={factorySameAsRegistered}
            onChange={(e) => handleFactorySameToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          Factory address same as registered address
        </label>

        <StructuredAddressFields
          prefix="factory"
          form={form}
          errors={errors}
          onFieldChange={onFieldChange}
          locked={factorySameAsRegistered}
          country={countryOrigin}
        />

        <PrivacyVisibilitySelect
          className="mt-2"
          value={factoryAddressVisibility}
          onChange={(v) => onFieldChange("factoryAddressVisibility", v)}
        />
      </div>
    </div>
  );
}
