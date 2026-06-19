"use client";

import { useRef, useState } from "react";
import { Upload, X, Eye, AlertCircle, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { uploadSellerFile, deleteSellerUpload, type UploadResult } from "@/lib/marketplace/seller-upload-client";

export type VideoUploadAsset = UploadResult;

type VideoUploadFieldProps = {
  label?: string;
  category?: string;
  video?: VideoUploadAsset | null;
  videoUrl?: string;
  error?: string;
  onVideoChange: (video: VideoUploadAsset | null) => void;
  onUrlChange: (url: string) => void;
};

const MAX_VIDEO_MB = 500;

function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);
}

export function VideoUploadField({
  label = "Factory Tour Video",
  category = "factory_tour",
  video,
  videoUrl,
  error,
  onVideoChange,
  onUrlChange,
}: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setLocalError(`Video too large. Maximum size is ${MAX_VIDEO_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const result = await uploadSellerFile(file, "seller-videos", { category });
      onVideoChange(result);
      onUrlChange("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!video) return;
    try {
      await deleteSellerUpload(video.id, "seller-videos");
      onVideoChange(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleUrlBlur = () => {
    setUrlError(null);
    if (videoUrl && !isValidYouTubeUrl(videoUrl)) {
      setUrlError("Please enter a valid YouTube URL.");
    }
  };

  const previewUrl = video?.publicUrl || video?.signedUrl || undefined;

  return (
    <div className={cn("rounded-lg border bg-white p-4", error || localError || urlError ? "border-red-300" : "border-slate-200")}>
      <div className="mb-3">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <p className="text-xs text-slate-500">Upload an MP4 (max {MAX_VIDEO_MB} MB) or paste a YouTube URL.</p>
      </div>

      {!video ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 transition-colors",
            uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Film className="h-6 w-6 text-slate-400" />
          <span className="mt-2 text-sm font-medium text-slate-600">
            {uploading ? "Uploading..." : "Upload MP4"}
          </span>
          <span className="mt-1 text-xs text-slate-400">Max {MAX_VIDEO_MB} MB</span>
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white">
            <Film className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{video.originalFilename}</p>
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
              className="h-8 px-2 text-red-600 hover:text-red-700"
              onClick={() => void handleRemove()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3">
        <span className="text-xs font-medium text-slate-500">OR</span>
        <Input
          value={videoUrl || ""}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="https://youtube.com/..."
          className={cn("mt-2", urlError ? "border-red-300" : "")}
        />
      </div>

      {(error || localError || urlError) ? (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error || localError || urlError}</span>
        </div>
      ) : null}
    </div>
  );
}
