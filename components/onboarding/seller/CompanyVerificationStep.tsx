"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck, ShieldPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Field, TextInput, NativeSelect } from "@/components/onboarding/OnboardingV3Wizard";
import { SearchableDropdown } from "@/components/location/SearchableDropdown";
import { DocumentUploadField } from "./DocumentUploadField";
import { StructuredAddressFields, ALL_COUNTRIES } from "./StructuredAddressFields";
import { SELLER_DOCUMENT_TYPE_KEYS } from "@/lib/marketplace/seller-onboarding-validation";
import { BUSINESS_NATURE_OPTIONS } from "@/lib/marketplace/onboarding-v3";
import type { StepProps, SellerUploadAsset } from "./types";

type CompanyVerificationStepProps = StepProps & {
  onVerifyGst: () => void;
  verifyingGst: boolean;
  gstError?: string | null;
  onRetryGst?: () => void;
  onBeforeUpload?: () => Promise<boolean>;
};

const VERIFICATION_TYPES = ["DUNS Number", "Company Registration Number"] as const;

export function CompanyVerificationStep({
  form,
  errors,
  documents,
  onFieldChange,
  onDocumentChange,
  onVerifyGst,
  verifyingGst,
  gstError,
  onRetryGst,
  onBeforeUpload,
}: CompanyVerificationStepProps) {
  const countryOrigin = String(form.countryOrigin ?? "");
  const isIndia = countryOrigin.toLowerCase() === "india";
  const isGstVerified = Boolean(form.gstVerified);
  const verificationType = String(form.verificationType ?? "");
  const businessNature = String(form.businessNature ?? "");
  const sellerTypeOther = String(form.sellerTypeOther ?? "");
  const gstErrorMessage = gstError === "INVALID_GSTIN"
    ? "Enter a valid 15-character GST number."
    : gstError === "GST_API_NOT_CONFIGURED"
      ? "GST verification is not configured yet. Please contact support."
      : "Unable to verify GST right now. Please try again.";
  const gstErrorTitle = gstError === "INVALID_GSTIN"
    ? "Invalid GST number"
    : gstError === "GST_API_NOT_CONFIGURED"
      ? "GST verification unavailable"
      : "GST API Error";

  const handleCountrySelect = (country: string) => {
    onFieldChange("countryOrigin", country);
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-sm text-slate-600">
        Verify your business identity. Country determines which verification requirements apply.
      </p>

      {/* Business Nature — adaptive path selector */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Business Nature <span className="text-red-500">*</span>
        </label>
        {errors.businessNature ? (
          <p className="mb-2 text-xs font-semibold text-red-600">{errors.businessNature}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_NATURE_OPTIONS.map((nature) => (
            <label
              key={nature}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors",
                businessNature === nature
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <input
                type="radio"
                name="businessNature"
                value={nature}
                checked={businessNature === nature}
                onChange={() => onFieldChange("businessNature", nature)}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              {nature}
            </label>
          ))}
        </div>
        {businessNature === "Other" ? (
          <div className="mt-3">
            <TextInput
              value={sellerTypeOther}
              onChange={(e) => onFieldChange("sellerTypeOther", e.target.value)}
              placeholder="Please describe your business nature..."
            />
          </div>
        ) : null}
      </div>
      {/* Country of Origin — searchable dropdown */}
      <Field label="Country of Origin" required error={errors.countryOrigin}>
        <SearchableDropdown
          value={countryOrigin}
          options={ALL_COUNTRIES}
          onSelect={handleCountrySelect}
          placeholder="Search country..."
          error={Boolean(errors.countryOrigin)}
          emptyMessage="No countries found"
        />
      </Field>

      {/* Conditional Verification Section */}
      {countryOrigin ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 space-y-5">
          {isIndia ? (
            <>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">GST Verification</h3>

              {gstError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div className="flex-1 text-sm text-red-800">
                      <p className="font-semibold">{gstErrorTitle}</p>
                      <p className="mt-1">{gstErrorMessage}</p>
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

              {/* GST Number Input */}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      GST Number *
                    </span>
                    {isGstVerified ? (
                      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold text-slate-900">{String(form.gstNumber || "")}</p>
                          <p className="text-xs font-medium text-emerald-700">GST verified successfully</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Verified</span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-blue-600/20",
                          errors.gstNumber ? "border-red-300" : "border-slate-200"
                        )}
                      >
                        <input
                          value={String(form.gstNumber || "")}
                          onChange={(e) => onFieldChange("gstNumber", e.target.value.toUpperCase())}
                          placeholder="24ADUPV1084A2ZF"
                          className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-sm font-mono text-slate-900 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={onVerifyGst}
                          disabled={verifyingGst || !String(form.gstNumber || "").trim()}
                          className={cn(
                            "flex shrink-0 items-center gap-2 border-l border-slate-200 px-5 text-sm font-semibold transition-all",
                            "bg-slate-950 text-white hover:bg-slate-800",
                            "disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]"
                          )}
                        >
                          {verifyingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          {verifyingGst ? "Verifying..." : "Verify GST"}
                        </button>
                      </div>
                    )}
                    {errors.gstNumber ? (
                      <span className="mt-1.5 block text-xs font-semibold text-red-600">{errors.gstNumber}</span>
                    ) : !isGstVerified ? (
                      <span className="mt-1.5 block text-xs text-slate-500">Enter your 15-character GSTIN and verify before continuing.</span>
                    ) : null}
                  </label>
                </div>
              </div>

              {/* India Documents */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DocumentUploadField
                  label="GST Certificate"
                  required
                  documentType={SELLER_DOCUMENT_TYPE_KEYS.gstCertificate}
                  accept=".pdf"
                  maxSizeMB={10}
                  asset={documents[SELLER_DOCUMENT_TYPE_KEYS.gstCertificate]}
                  error={errors.gstCertificateDocumentId}
                  onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.gstCertificate, asset)}
                  onBeforeUpload={onBeforeUpload}
                />
                <DocumentUploadField
                  label="PAN Card"
                  required
                  documentType={SELLER_DOCUMENT_TYPE_KEYS.panCard}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={10}
                  asset={documents[SELLER_DOCUMENT_TYPE_KEYS.panCard]}
                  error={errors.panCardDocumentId}
                  onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.panCard, asset)}
                  onBeforeUpload={onBeforeUpload}
                />
                <DocumentUploadField
                  label="Udyam (Optional)"
                  documentType={SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate}
                  accept=".pdf"
                  maxSizeMB={10}
                  asset={documents[SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate]}
                  onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate, asset)}
                  onBeforeUpload={onBeforeUpload}
                />
                <DocumentUploadField
                  label="IEC (Optional)"
                  documentType={SELLER_DOCUMENT_TYPE_KEYS.iecCertificate}
                  accept=".pdf"
                  maxSizeMB={10}
                  asset={documents[SELLER_DOCUMENT_TYPE_KEYS.iecCertificate]}
                  onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.iecCertificate, asset)}
                  onBeforeUpload={onBeforeUpload}
                />
                {/* Factory License — Optional for all business types */}
                <div className="relative">
                  <DocumentUploadField
                    label="Factory License"
                    documentType={SELLER_DOCUMENT_TYPE_KEYS.factoryLicense}
                    accept=".pdf"
                    maxSizeMB={10}
                    asset={documents[SELLER_DOCUMENT_TYPE_KEYS.factoryLicense]}
                    onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.factoryLicense, asset)}
                    onBeforeUpload={onBeforeUpload}
                  />
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                    <ShieldPlus className="h-3.5 w-3.5" />
                    <span>Optional — uploading strengthens your trust score</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">International Verification</h3>

              <Field label="Verification Type" required error={errors.verificationType}>
                <div className="flex gap-4">
                  {VERIFICATION_TYPES.map((type) => (
                    <label
                      key={type}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors",
                        verificationType === type
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="verificationType"
                        value={type}
                        checked={verificationType === type}
                        onChange={() => onFieldChange("verificationType", type)}
                        className="sr-only"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </Field>

              {verificationType === "DUNS Number" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="DUNS Number" required error={errors.dunsNumber}>
                    <TextInput
                      value={String(form.dunsNumber || "")}
                      onChange={(e) => onFieldChange("dunsNumber", e.target.value)}
                      error={Boolean(errors.dunsNumber)}
                    />
                  </Field>
                  <DocumentUploadField
                    label="DUNS Certificate"
                    required
                    documentType={SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate}
                    accept=".pdf"
                    maxSizeMB={10}
                    asset={documents[SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate]}
                    error={errors.dunsCertificateDocumentId}
                    onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate, asset)}
                    onBeforeUpload={onBeforeUpload}
                  />
                </div>
              ) : null}

              {verificationType === "Company Registration Number" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Company Registration Number" required error={errors.companyRegistrationNumber}>
                    <TextInput
                      value={String(form.companyRegistrationNumber || "")}
                      onChange={(e) => onFieldChange("companyRegistrationNumber", e.target.value)}
                      error={Boolean(errors.companyRegistrationNumber)}
                    />
                  </Field>
                  <Field label="Country of Registration" error={errors.countryOfRegistration}>
                    <TextInput
                      value={String(form.countryOfRegistration || countryOrigin)}
                      onChange={(e) => onFieldChange("countryOfRegistration", e.target.value)}
                    />
                  </Field>
                  <DocumentUploadField
                    label="Registration Certificate"
                    required
                    documentType="company_registration_certificate"
                    accept=".pdf"
                    maxSizeMB={10}
                    asset={documents.company_registration_certificate}
                    error={errors.companyRegistrationCertificateDocumentId}
                    onChange={(asset) => onDocumentChange("company_registration_certificate", asset)}
                    onBeforeUpload={onBeforeUpload}
                  />
                </div>
              ) : null}

              <DocumentUploadField
                label="Factory / Business License"
                documentType={SELLER_DOCUMENT_TYPE_KEYS.factoryLicense}
                accept=".pdf"
                maxSizeMB={10}
                asset={documents[SELLER_DOCUMENT_TYPE_KEYS.factoryLicense]}
                onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.factoryLicense, asset)}
                onBeforeUpload={onBeforeUpload}
              />
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                <ShieldPlus className="h-3.5 w-3.5" />
                <span>Optional — uploading strengthens your trust score</span>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Company Legal Name */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Company Legal Name" required error={errors.legalBusinessName}>
          <TextInput
            value={String(form.legalBusinessName || "")}
            onChange={(e) => onFieldChange("legalBusinessName", e.target.value)}
            error={Boolean(errors.legalBusinessName)}
          />
        </Field>
        <Field label="Company Name (Display)" error={errors.companyName}>
          <TextInput
            value={String(form.companyName || "")}
            onChange={(e) => onFieldChange("companyName", e.target.value)}
          />
        </Field>
      </div>

      {/* Structured Registered Address */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Registered Address</h3>
        <StructuredAddressFields
          prefix=""
          form={form}
          errors={errors}
          onFieldChange={onFieldChange}
          country={countryOrigin}
        />
      </div>
    </div>
  );
}
