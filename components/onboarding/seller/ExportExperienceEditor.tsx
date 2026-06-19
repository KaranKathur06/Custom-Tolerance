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
        <h3 className="text-sm font-bold text-slate-950">Export Experience</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              {
                customerName: "",
                country: "",
                productExported: "",
                orderValue: "",
              },
            ])
          }
        >
          Add Export
        </Button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-3">
            <TextInput
              value={row.customerName}
              placeholder="Customer name *"
              onChange={(e) => updateRow(index, { customerName: e.target.value })}
              className={errors[`exportExperience[${index}].customerName`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.country}
              placeholder="Country *"
              onChange={(e) => updateRow(index, { country: e.target.value })}
              className={errors[`exportExperience[${index}].country`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.productExported}
              placeholder="Product exported"
              onChange={(e) => updateRow(index, { productExported: e.target.value })}
            />
            <TextInput
              value={row.orderValue}
              placeholder="Order value"
              onChange={(e) => updateRow(index, { orderValue: e.target.value })}
            />
            <DocumentUploadField
              label="Purchase Order (PO)"
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
              label="Invoice"
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
              label="Shipping Bill"
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
              label="Export Certificate"
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
