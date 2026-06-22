"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { DocumentUploadField } from "./DocumentUploadField";
import { SELLER_DOCUMENT_TYPE_KEYS } from "@/lib/marketplace/seller-onboarding-validation";
import { getBankFieldConfig } from "@/lib/location/bank-fields";
import type { StepProps } from "./types";

function Agreement({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function BankDetailsStep({ form, errors, documents, onFieldChange, onDocumentChange }: StepProps) {
  const countryOrigin = String(form.countryOrigin ?? "");
  const bankConfig = useMemo(() => getBankFieldConfig(countryOrigin), [countryOrigin]);

  const isExporter = Array.isArray(form.sellerTypes)
    ? (form.sellerTypes as string[]).includes("Exporter")
    : String(form.sellerType || "") === "Exporter";

  // Account number mismatch detection
  const accountNumber = String(form.accountNumber || "");
  const confirmAccountNumber = String(form.confirmAccountNumber || "");
  const accountMismatch =
    accountNumber.length > 0 &&
    confirmAccountNumber.length > 0 &&
    accountNumber !== confirmAccountNumber;

  return (
    <div className="mt-6 space-y-8">
      <p className="text-sm text-slate-600">Add bank details and upload KYC documents for trust verification.</p>

      {/* Bank Details */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Bank Details</h3>
        {countryOrigin ? (
          <p className="mb-4 text-xs text-slate-400">
            Showing fields for <span className="font-semibold">{bankConfig.region}</span>
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {bankConfig.fields.map((fieldDef) => (
            <Field
              key={fieldDef.key}
              label={fieldDef.label}
              required={fieldDef.required}
              error={errors[fieldDef.key]}
            >
              <TextInput
                value={String(form[fieldDef.key] || "")}
                onChange={(e) =>
                  onFieldChange(
                    fieldDef.key,
                    fieldDef.uppercase ? e.target.value.toUpperCase() : e.target.value
                  )
                }
                placeholder={fieldDef.placeholder}
                error={Boolean(errors[fieldDef.key])}
              />
            </Field>
          ))}
        </div>
        {/* Account mismatch inline error */}
        {accountMismatch ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Account numbers do not match</span>
          </div>
        ) : null}
      </div>

      {/* KYC Documents */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">KYC Documents</h3>
        <p className="mb-4 text-xs text-slate-500">Upload KYC documents for verification. All files are stored securely.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bankConfig.kycDocs.map((docDef) => {
            // Map doc keys to the actual document type keys
            const docTypeKey = SELLER_DOCUMENT_TYPE_KEYS[docDef.key as keyof typeof SELLER_DOCUMENT_TYPE_KEYS] || docDef.key;
            const docErrorKey = `${docDef.key}DocumentId`;
            return (
              <DocumentUploadField
                key={docDef.key}
                label={docDef.label}
                required={docDef.required}
                documentType={docTypeKey}
                accept={docDef.accept}
                maxSizeMB={10}
                asset={documents[docTypeKey]}
                error={errors[docErrorKey]}
                onChange={(asset) => onDocumentChange(docTypeKey, asset)}
              />
            );
          })}
          {isExporter ? (
            <>
              <Field label="IEC Number" error={errors.iecNumber}>
                <TextInput
                  value={String(form.iecNumber || "")}
                  onChange={(e) => onFieldChange("iecNumber", e.target.value)}
                  error={Boolean(errors.iecNumber)}
                />
              </Field>
              <DocumentUploadField
                label="IEC Certificate"
                documentType={SELLER_DOCUMENT_TYPE_KEYS.iecCertificate}
                accept=".pdf"
                maxSizeMB={10}
                asset={documents[SELLER_DOCUMENT_TYPE_KEYS.iecCertificate]}
                error={errors.iecCertificateDocumentId}
                onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.iecCertificate, asset)}
              />
            </>
          ) : null}
          <DocumentUploadField
            label="DUNS Certificate"
            documentType={SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate}
            accept=".pdf"
            maxSizeMB={10}
            asset={documents[SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate]}
            error={errors.dunsCertificateDocumentId}
            onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.dunsCertificate, asset)}
          />
        </div>
        {isExporter ? null : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Field label="PAN Number" error={errors.panNumber}>
              <TextInput
                value={String(form.panNumber || "")}
                onChange={(e) => onFieldChange("panNumber", e.target.value.toUpperCase())}
                error={Boolean(errors.panNumber)}
              />
            </Field>
            <Field label="DUNS Number" error={errors.dunsNumber}>
              <TextInput
                value={String(form.dunsNumber || "")}
                onChange={(e) => onFieldChange("dunsNumber", e.target.value)}
                error={Boolean(errors.dunsNumber)}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Agreements */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Agreements</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <Agreement label="Seller Agreement" checked={Boolean(form.sellerAgreement)} onChange={(v) => onFieldChange("sellerAgreement", v)} />
          <Agreement label="Terms and Conditions" checked={Boolean(form.termsAccepted)} onChange={(v) => onFieldChange("termsAccepted", v)} />
          <Agreement label="Privacy Policy" checked={Boolean(form.privacyAccepted)} onChange={(v) => onFieldChange("privacyAccepted", v)} />
          <Agreement label="KYC Consent" checked={Boolean(form.kycConsent)} onChange={(v) => onFieldChange("kycConsent", v)} />
        </div>
      </div>
    </div>
  );
}
