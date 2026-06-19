"use client";

import { useRef, useState } from "react";
import { Upload, X, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadSellerFile, deleteSellerUpload, type UploadResult } from "@/lib/marketplace/seller-upload-client";

export type ImageUploadAsset = UploadResult;

type ImageUploadGridProps = {
  category: string;
  label: string;
  required?: boolean;
  images: ImageUploadAsset[];
  min: number;
  max: number;
  error?: string;
  onChange: (images: ImageUploadAsset[]) => void;
};

export function ImageUploadGrid({
  category,
  label,
  required,
  images,
  min,
  max,
  error,
  onChange,
}: ImageUploadGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    setLocalError(null);
    if (!files) return;
    const fileArray = Array.from(files);
    if (images.length + fileArray.length > max) {
      setLocalError(`You can upload at most ${max} images for ${category}.`);
      return;
    }
    setUploading(true);
    try {
      const results = await Promise.all(
        fileArray.map((file) => uploadSellerFile(file, "seller-images", { category })),
      );
      onChange([...images, ...results]);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (asset: ImageUploadAsset) => {
    try {
      await deleteSellerUpload(asset.id, "seller-images");
      onChange(images.filter((img) => img.id !== asset.id));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const canAdd = images.length < max;

  return (
    <div className={cn("rounded-lg border bg-white p-4", error || localError ? "border-red-300" : "border-slate-200")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {images.length}/{max}
          </span>
        </span>
      </div>

      {images.length > 0 ? (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-100"
            >
              {image.publicUrl || image.signedUrl ? (
                <img
                  src={image.publicUrl || image.signedUrl || undefined}
                  alt={image.originalFilename}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-xs text-slate-500">
                  No preview
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-slate-950/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {(image.publicUrl || image.signedUrl) ? (
                  <Button type="button" variant="ghost" size="sm" asChild className="h-7 px-2 text-white hover:bg-white/20">
                    <a href={image.publicUrl || image.signedUrl || undefined} target="_blank" rel="noreferrer">
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-white hover:bg-white/20"
                  onClick={() => void handleRemove(image)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="truncate px-2 py-1 text-xs text-slate-600">{image.originalFilename}</p>
            </div>
          ))}
        </div>
      ) : null}

      {canAdd ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-4 transition-colors",
            uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="mt-1 text-xs font-medium text-slate-600">
            {uploading ? "Uploading..." : "Upload JPG / PNG / WEBP"}
          </span>
        </label>
      ) : null}

      {images.length < min ? (
        <p className="mt-2 text-xs text-slate-500">Minimum {min} image{min === 1 ? "" : "s"} required.</p>
      ) : null}

      {(error || localError) ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error || localError}</span>
        </div>
      ) : null}
    </div>
  );
}
