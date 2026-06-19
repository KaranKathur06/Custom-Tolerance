"use client";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { SingleImageUploadField, type SingleImageAsset } from "./SingleImageUploadField";
import { DocumentUploadField, type DocumentUploadAsset } from "./DocumentUploadField";
import { VideoUploadField } from "./VideoUploadField";
import type { MachineRow } from "./types";
import type { UploadResult } from "@/lib/marketplace/seller-upload-client";

type MachinesEditorProps = {
  rows: MachineRow[];
  errors: Record<string, string>;
  onChange: (rows: MachineRow[]) => void;
};

export function MachinesEditor({ rows, errors, onChange }: MachinesEditorProps) {
  const updateRow = (index: number, patch: Partial<MachineRow>) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-950">Machines</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              {
                machineName: "",
                brand: "",
                model: "",
                quantity: "1",
                capacity: "",
                yearPurchased: "",
              },
            ])
          }
        >
          Add Machine
        </Button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-3">
            <TextInput
              value={row.machineName}
              placeholder="Machine name *"
              onChange={(e) => updateRow(index, { machineName: e.target.value })}
              className={errors[`machines[${index}].machineName`] ? "border-red-300" : ""}
            />
            <TextInput
              value={row.brand}
              placeholder="Brand"
              onChange={(e) => updateRow(index, { brand: e.target.value })}
            />
            <TextInput
              value={row.model}
              placeholder="Model"
              onChange={(e) => updateRow(index, { model: e.target.value })}
            />
            <TextInput
              value={row.quantity}
              placeholder="Quantity"
              onChange={(e) => updateRow(index, { quantity: e.target.value })}
            />
            <TextInput
              value={row.capacity}
              placeholder="Capacity"
              onChange={(e) => updateRow(index, { capacity: e.target.value })}
            />
            <TextInput
              value={row.yearPurchased}
              placeholder="Year purchased"
              onChange={(e) => updateRow(index, { yearPurchased: e.target.value })}
            />
            <SingleImageUploadField
              label="Machine photo"
              category="machine_photos"
              asset={row.photoFileId ? buildImageAsset(row.photoFileId, row.photoFileUrl, row.photoStoragePath) : null}
              onChange={(asset) =>
                updateRow(index, {
                  photoFileId: asset?.id ?? undefined,
                  photoFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  photoStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <DocumentUploadField
              label="Datasheet (PDF)"
              documentType="machine_datasheet"
              accept=".pdf"
              maxSizeMB={10}
              asset={row.datasheetFileId ? buildDocAsset(row.datasheetFileId, row.datasheetFileUrl, row.datasheetStoragePath) : null}
              onChange={(asset) =>
                updateRow(index, {
                  datasheetFileId: asset?.id ?? undefined,
                  datasheetFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                  datasheetStoragePath: asset?.storagePath ?? undefined,
                })
              }
            />
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Machine video (optional)</span>
              <VideoUploadField
                label="Machine Video"
                category="machine_videos"
                video={row.videoFileId ? buildVideoAsset(row) : null}
                videoUrl={row.videoUrl || ""}
                onVideoChange={(asset) =>
                  updateRow(index, {
                    videoFileId: asset?.id ?? undefined,
                    videoFileUrl: asset?.publicUrl || asset?.signedUrl || undefined,
                    videoStoragePath: asset?.storagePath ?? undefined,
                    videoUrl: asset ? "" : row.videoUrl,
                  })
                }
                onUrlChange={(url) =>
                  updateRow(index, {
                    videoUrl: url,
                    videoFileId: url ? undefined : row.videoFileId,
                    videoFileUrl: url ? undefined : row.videoFileUrl,
                    videoStoragePath: url ? undefined : row.videoStoragePath,
                  })
                }
              />
            </div>
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

function buildImageAsset(id: string, url: string | undefined, storagePath: string | undefined): SingleImageAsset {
  return {
    id,
    publicUrl: url,
    storagePath: storagePath || "",
    bucketName: "seller-images",
    originalFilename: "",
    mimeType: "",
    fileSize: 0,
  };
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

function buildVideoAsset(row: MachineRow): UploadResult | null {
  if (!row.videoFileId) return null;
  return {
    id: row.videoFileId,
    publicUrl: row.videoFileUrl,
    storagePath: row.videoStoragePath || "",
    bucketName: "seller-videos",
    originalFilename: "",
    mimeType: "",
    fileSize: 0,
  };
}
