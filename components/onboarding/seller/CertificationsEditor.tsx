"use client";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { DocumentUploadField, type DocumentUploadAsset } from "./DocumentUploadField";
import { SingleImageUploadField } from "./SingleImageUploadField";
import type { CertificationRow } from "./types";

type CertificationsEditorProps = {
  rows: CertificationRow[];
  errors: Record<string, string>;
  onChange: (rows: CertificationRow[]) => void;
};

export function CertificationsEditor({ rows, errors, onChange }: CertificationsEditorProps) {
  const updateRow = (index: number, patch: Partial<CertificationRow>) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-950">Certifications</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              {
                certificateName: "",
                certificateNumber: "",
                expiryDate: "",
              },
            ])
          }
        >
          Add Certification
        </Button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-3">
            <TextInput
              value={row.certificateName}
              placeholder="Certificate name *"
              onChange={(e) => updateRow(index, { certificateName: e.target.value })}
              className={errors[`certifications[${index}].certificateName`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.certificateNumber}
              placeholder="Certificate number"
              onChange={(e) => updateRow(index, { certificateNumber: e.target.value })}
            />
            <TextInput
              type="date"
              value={row.expiryDate}
              placeholder="Expiry date"
              onChange={(e) => updateRow(index, { expiryDate: e.target.value })}
            />
            <DocumentUploadField
              label="Certificate PDF"
              documentType="certificate_pdf"
              accept=".pdf"
              maxSizeMB={10}
              asset={row.certificateFileId ? buildDocAsset(row.certificateFileId, row.certificateFileUrl, row.certificateStoragePath) : null}
              error={errors[`certifications[${index}].certificateFileId`]}
              onChange={(asset) =>
                updateRow(index, {
                  certificateFileId: asset?.id ?? undefined,
                  certificateFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  certificateStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <SingleImageUploadField
              label="Certificate image"
              category="certificate_images"
              asset={
                row.certificateImageFileId
                  ? {
                      id: row.certificateImageFileId,
                      publicUrl: row.certificateImageFileUrl,
                      storagePath: row.certificateImageStoragePath || "",
                      bucketName: "seller-images",
                      originalFilename: "",
                      mimeType: "",
                      fileSize: 0,
                    }
                  : null
              }
              onChange={(asset) =>
                updateRow(index, {
                  certificateImageFileId: asset?.id ?? undefined,
                  certificateImageFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  certificateImageStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <div className="flex items-end justify-end">
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

function buildDocAsset(id: string, url: string | undefined, storagePath: string | undefined): DocumentUploadAsset {
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
