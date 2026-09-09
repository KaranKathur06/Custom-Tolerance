"use client";

import { Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MediaPreview = {
  url: string;
  name?: string | null;
  mimeType?: string | null;
};

type MediaPreviewModalProps = {
  media: MediaPreview | null;
  onClose: () => void;
  onDownload?: () => void;
};

export function MediaPreviewModal({ media, onClose, onDownload }: MediaPreviewModalProps) {
  if (!media) return null;

  const isImage = media.mimeType?.startsWith("image/");
  const isVideo = media.mimeType?.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={media.name || "Media preview"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{media.name || "Preview"}</p>
          <div className="flex shrink-0 items-center gap-2">
            {onDownload ? (
              <Button type="button" variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.name || "Preview"} className="max-h-[78vh] max-w-full object-contain" />
          ) : isVideo ? (
            <video src={media.url} controls className="max-h-[78vh] max-w-full" />
          ) : (
            <iframe src={media.url} title={media.name || "Document preview"} className="h-[78vh] w-full rounded border-0 bg-white" />
          )}
          {!isImage && !isVideo && !media.mimeType ? (
            <div className="absolute flex flex-col items-center gap-2 text-slate-500">
              <FileText className="h-8 w-8" />
              <span className="text-sm">Document preview</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
