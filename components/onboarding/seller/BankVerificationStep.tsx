"use client";

import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { DocumentUploadField } from "./DocumentUploadField";
import { SELLER_DOCUMENT_TYPE_KEYS } from "@/lib/marketplace/seller-onboarding-validation";
import type { StepProps } from "./types";

function Agreement({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function BankVerificationStep({ form, errors, documents, onFieldChange, onDocumentChange }: StepProps) {
  const isExporter = String(form.sellerType || "") === "Exporter";

  return (
    <div className="mt-6 space-y-8">
      <p className="text-sm text-slate-600">Complete KYC requirements needed for marketplace activation.</p>

      {/* Bank Details */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Bank Details</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Bank name" required error={errors.bankName}>
            <TextInput
              value={String(form.bankName || "")}
              onChange={(e) => onFieldChange("bankName", e.target.value)}
              error={Boolean(errors.bankName)}
            />
          </Field>
          <Field label="Account holder name" required error={errors.accountHolderName}>
            <TextInput
              value={String(form.accountHolderName || "")}
              onChange={(e) => onFieldChange("accountHolderName", e.target.value)}
              error={Boolean(errors.accountHolderName)}
            />
          </Field>
          <Field label="Account number" required error={errors.accountNumber}>
            <TextInput
              value={String(form.accountNumber || "")}
              onChange={(e) => onFieldChange("accountNumber", e.target.value)}
              error={Boolean(errors.accountNumber)}
            />
          </Field>
          <Field label="Confirm account number" required error={errors.confirmAccountNumber}>
            <TextInput
              value={String(form.confirmAccountNumber || "")}
              onChange={(e) => onFieldChange("confirmAccountNumber", e.target.value)}
              error={Boolean(errors.confirmAccountNumber)}
            />
          </Field>
          <Field label="IFSC code" required error={errors.ifscCode}>
            <TextInput
              value={String(form.ifscCode || "")}
              onChange={(e) => onFieldChange("ifscCode", e.target.value.toUpperCase())}
              error={Boolean(errors.ifscCode)}
            />
          </Field>
          <Field label="Branch name" required error={errors.branchName}>
            <TextInput
              value={String(form.branchName || "")}
              onChange={(e) => onFieldChange("branchName", e.target.value)}
              error={Boolean(errors.branchName)}
            />
          </Field>
        </div>
      </div>

      {/* KYC Documents — Document Center */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-5">
        <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Bank & Documents</h3>
        <p className="mb-4 text-xs text-slate-500">Upload KYC documents for verification. All files are stored securely and reviewed by our team.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DocumentUploadField
            label="Cancelled Cheque"
            required
            documentType={SELLER_DOCUMENT_TYPE_KEYS.cancelledCheque}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={10}
            asset={documents[SELLER_DOCUMENT_TYPE_KEYS.cancelledCheque]}
            error={errors.cancelledChequeDocumentId}
            onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.cancelledCheque, asset)}
          />
          <DocumentUploadField
            label="GST Certificate"
            required
            documentType={SELLER_DOCUMENT_TYPE_KEYS.gstCertificate}
            accept=".pdf"
            maxSizeMB={10}
            asset={documents[SELLER_DOCUMENT_TYPE_KEYS.gstCertificate]}
            error={errors.gstCertificateDocumentId}
            onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.gstCertificate, asset)}
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
          />
          <DocumentUploadField
            label="Factory License"
            required
            documentType={SELLER_DOCUMENT_TYPE_KEYS.factoryLicense}
            accept=".pdf"
            maxSizeMB={10}
            asset={documents[SELLER_DOCUMENT_TYPE_KEYS.factoryLicense]}
            error={errors.factoryLicenseDocumentId}
            onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.factoryLicense, asset)}
          />
          {isExporter ? (
            <>
              <Field label="IEC number" required error={errors.iecNumber}>
                <TextInput
                  value={String(form.iecNumber || "")}
                  onChange={(e) => onFieldChange("iecNumber", e.target.value)}
                  error={Boolean(errors.iecNumber)}
                />
              </Field>
              <DocumentUploadField
                label="IEC Certificate"
                required
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
          <DocumentUploadField
            label="Udyam Certificate"
            documentType={SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate}
            accept=".pdf"
            maxSizeMB={10}
            asset={documents[SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate]}
            error={errors.udyamCertificateDocumentId}
            onChange={(asset) => onDocumentChange(SELLER_DOCUMENT_TYPE_KEYS.udyamCertificate, asset)}
          />
        </div>
        {isExporter ? null : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Field label="DUNS Number" error={errors.dunsNumber}>
              <TextInput value={String(form.dunsNumber || "")} onChange={(e) => onFieldChange("dunsNumber", e.target.value)} />
            </Field>
            <Field label="Udyam Number" error={errors.msmeNumber}>
              <TextInput value={String(form.msmeNumber || "")} onChange={(e) => onFieldChange("msmeNumber", e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {/* PAN Number */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="PAN number" required error={errors.panNumber}>
          <TextInput
            value={String(form.panNumber || "")}
            onChange={(e) => onFieldChange("panNumber", e.target.value.toUpperCase())}
            error={Boolean(errors.panNumber)}
          />
        </Field>
      </div>

      {/* Agreements */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Agreement label="Seller Agreement" checked={Boolean(form.sellerAgreement)} onChange={(value) => onFieldChange("sellerAgreement", value)} />
        <Agreement label="Terms and Conditions" checked={Boolean(form.termsAccepted)} onChange={(value) => onFieldChange("termsAccepted", value)} />
        <Agreement label="Privacy Policy" checked={Boolean(form.privacyAccepted)} onChange={(value) => onFieldChange("privacyAccepted", value)} />
        <Agreement label="KYC Consent" checked={Boolean(form.kycConsent)} onChange={(value) => onFieldChange("kycConsent", value)} />
      </div>
    </div>
  );
}
