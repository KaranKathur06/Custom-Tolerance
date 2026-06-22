"use client";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { DocumentUploadField, type DocumentUploadAsset } from "./DocumentUploadField";
import type { ExportRow } from "./types";

type ExportExperienceEditorProps = {
  rows: ExportRow[];
  errors: Record<string, string>;
  onChange: (rows: ExportRow[]) => void;
};

export function ExportExperienceEditor({ rows, errors, onChange }: ExportExperienceEditorProps) {
  const updateRow = (index: number, patch: Partial<ExportRow>) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-950">Export Experience</h3>
          <p className="mt-0.5 text-xs text-slate-500">Add export records to build buyer confidence.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              {
                customerIndustry: "",
                country: "",
                productsExported: "",
                yearStarted: "",
                annualExportValue: "",
              },
            ])
          }
        >
          Add Export Record
        </Button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-3">
            <TextInput
              value={row.customerIndustry}
              placeholder="Customer Industry"
              onChange={(e) => updateRow(index, { customerIndustry: e.target.value })}
              className={errors[`exportExperience[${index}].customerIndustry`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.country}
              placeholder="Country *"
              onChange={(e) => updateRow(index, { country: e.target.value })}
              className={errors[`exportExperience[${index}].country`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.productsExported}
              placeholder="Products Exported"
              onChange={(e) => updateRow(index, { productsExported: e.target.value })}
            />
            <TextInput
              value={row.yearStarted}
              placeholder="Year Started"
              onChange={(e) => updateRow(index, { yearStarted: e.target.value })}
            />
            <TextInput
              value={row.annualExportValue}
              placeholder="Annual Export Value"
              onChange={(e) => updateRow(index, { annualExportValue: e.target.value })}
            />
            <DocumentUploadField
              label="PO (Optional)"
              documentType="export_po"
              accept=".pdf"
              maxSizeMB={10}
              asset={row.poFileId ? buildAsset(row.poFileId, row.poFileUrl, row.poStoragePath) : null}
              onChange={(asset) =>
                updateRow(index, {
                  poFileId: asset?.id ?? undefined,
                  poFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  poStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <DocumentUploadField
              label="Invoice (Optional)"
              documentType="export_invoice"
              accept=".pdf"
              maxSizeMB={10}
              asset={row.invoiceFileId ? buildAsset(row.invoiceFileId, row.invoiceFileUrl, row.invoiceStoragePath) : null}
              onChange={(asset) =>
                updateRow(index, {
                  invoiceFileId: asset?.id ?? undefined,
                  invoiceFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  invoiceStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <DocumentUploadField
              label="Shipping Bill (Optional)"
              documentType="export_shipping_bill"
              accept=".pdf"
              maxSizeMB={10}
              asset={row.shippingBillFileId ? buildAsset(row.shippingBillFileId, row.shippingBillFileUrl, row.shippingBillStoragePath) : null}
              onChange={(asset) =>
                updateRow(index, {
                  shippingBillFileId: asset?.id ?? undefined,
                  shippingBillFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  shippingBillStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <DocumentUploadField
              label="Certificate (Optional)"
              documentType="export_certificate"
              accept=".pdf"
              maxSizeMB={10}
              asset={
                row.exportCertificateFileId
                  ? buildAsset(row.exportCertificateFileId, row.exportCertificateFileUrl, row.exportCertificateStoragePath)
                  : null
              }
              onChange={(asset) =>
                updateRow(index, {
                  exportCertificateFileId: asset?.id ?? undefined,
                  exportCertificateFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  exportCertificateStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <div className="flex items-end justify-end lg:col-span-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAsset(id: string, url: string | undefined, storagePath: string | undefined): DocumentUploadAsset {
  return {
    id,
    publicUrl: url,
    storagePath: storagePath || "",
    bucketName: "seller-documents",
    originalFilename: "",
    mimeType: "",
    fileSize: 0,
  };
}
