"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSellerFile, deleteSellerUpload, type UploadResult } from "@/lib/marketplace/seller-upload-client";

export type DocumentUploadAsset = UploadResult;

type DocumentUploadFieldProps = {
  label: string;
  required?: boolean;
  documentType: string;
  accept: string;
  maxSizeMB: number;
  asset?: DocumentUploadAsset | null;
  error?: string;
  onChange: (asset: DocumentUploadAsset | null) => void;
};

export function DocumentUploadField({
  label,
  required,
  documentType,
  accept,
  maxSizeMB,
  asset,
  error,
  onChange,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadSellerFile(file, "seller-documents", { documentType });
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
      await deleteSellerUpload(asset.id, "seller-documents");
      onChange(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const previewUrl = asset?.signedUrl || asset?.publicUrl || undefined;

  return (
    <div className={cn("rounded-lg border bg-white p-4", error || localError ? "border-red-300" : "border-slate-200")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </span>
      </div>

      {!asset ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 transition-colors",
            uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Upload className="h-6 w-6 text-slate-400" />
          <span className="mt-2 text-sm font-medium text-slate-600">
            {uploading ? "Uploading..." : `Upload ${accept.toUpperCase().replace(/,/g, "/")}`}
          </span>
          <span className="mt-1 text-xs text-slate-400">Max {maxSizeMB} MB</span>
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{asset.originalFilename}</p>
            <p className="text-xs text-emerald-600">Uploaded successfully</p>
          </div>
          <div className="flex items-center gap-1">
            {previewUrl ? (
              <Button type="button" variant="ghost" size="sm" asChild className="h-8 px-2">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-red-600 hover:text-red-700"
              onClick={() => void handleRemove()}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      )}

      {(error || localError) ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error || localError}</span>
        </div>
      ) : null}
    </div>
  );
}
