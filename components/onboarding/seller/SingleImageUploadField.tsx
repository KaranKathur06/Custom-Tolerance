"use client";

import { useRef, useState } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSellerFile, deleteSellerUpload, type UploadResult } from "@/lib/marketplace/seller-upload-client";

export type SingleImageAsset = UploadResult;

type SingleImageUploadFieldProps = {
  label?: string;
  category: string;
  asset?: SingleImageAsset | null;
  error?: string;
  onChange: (asset: SingleImageAsset | null) => void;
};

const MAX_IMAGE_MB = 10;

export function SingleImageUploadField({
  label,
  category,
  asset,
  error,
  onChange,
}: SingleImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setLocalError(`Image too large. Maximum size is ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadSellerFile(file, "seller-images", { category });
      onChange(result);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!asset) return;
    try {
      await deleteSellerUpload(asset.id, "seller-images");
      onChange(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const previewUrl = asset?.publicUrl || asset?.signedUrl || undefined;

  return (
    <div className={cn("rounded-md border bg-white p-2", error || localError ? "border-red-300" : "border-slate-200")}>
      {asset ? (
        <div className="flex items-center gap-2">
          {previewUrl ? (
            <img src={previewUrl} alt={asset.originalFilename} className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-500">IMG</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-900">{asset.originalFilename}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-red-600 hover:text-red-700"
            onClick={() => void handleRemove()}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : label || "Upload"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
      )}
      {(error || localError) ? (
        <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error || localError}</span>
        </div>
      ) : null}
    </div>
  );
}
