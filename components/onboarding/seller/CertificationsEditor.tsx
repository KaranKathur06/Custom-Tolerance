"use client";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { DocumentUploadField, type DocumentUploadAsset } from "./DocumentUploadField";
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
              { certificateName: "" },
            ])
          }
        >
          Add More / Other Certificate
        </Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-start"
          >
            {/* Certificate Name */}
            <div className="flex-1">
              <TextInput
                value={row.certificateName}
                placeholder="Certificate name *"
                onChange={(e) => updateRow(index, { certificateName: e.target.value })}
                className={errors[`certifications[${index}].certificateName`] ? "border-red-300" : ""}
              />
              {errors[`certifications[${index}].certificateName`] ? (
                <p className="mt-1 text-xs text-red-600">
                  {errors[`certifications[${index}].certificateName`]}
                </p>
              ) : null}
            </div>

            {/* Certificate PDF Upload */}
            <div className="sm:w-56">
              <DocumentUploadField
                label="Certificate PDF (optional)"
                documentType="certificate_pdf"
                accept=".pdf"
                maxSizeMB={10}
                asset={
                  row.certificateFileId
                    ? buildDocAsset(row.certificateFileId, row.certificateFileUrl, row.certificateStoragePath)
                    : null
                }
                error={errors[`certifications[${index}].certificateFileId`]}
                onChange={(asset) =>
                  updateRow(index, {
                    certificateFileId: asset?.id ?? undefined,
                    certificateFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                    certificateStoragePath: asset?.storagePath ?? undefined,
                  })
                }
              />
            </div>

            {/* Remove button */}
            <div className="flex items-start">
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

function buildDocAsset(
  id: string,
  url: string | undefined,
  storagePath: string | undefined,
): DocumentUploadAsset {
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
