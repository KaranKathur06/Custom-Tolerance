"use client";

import { useState } from "react";
import { Plus, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FactoryVideoUrlsFieldProps = {
  urls: string[];
  onChange: (urls: string[]) => void;
  error?: string;
};

type Platform = "youtube" | "vimeo" | "loom" | "other";

function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  if (/loom\.com/i.test(url)) return "loom";
  return "other";
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getEmbedUrl(url: string, platform: Platform): string | null {
  if (platform === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }
  if (platform === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  return null;
}

const PLATFORM_CONFIG: Record<Platform, { label: string; className: string }> = {
  youtube: { label: "YouTube", className: "bg-red-100 text-red-700" },
  vimeo: { label: "Vimeo", className: "bg-blue-100 text-blue-700" },
  loom: { label: "Loom", className: "bg-purple-100 text-purple-700" },
  other: { label: "URL", className: "bg-slate-100 text-slate-600" },
};

function PlatformBadge({ platform }: { platform: Platform }) {
  const { label, className } = PLATFORM_CONFIG[platform];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

export function FactoryVideoUrlsField({ urls, onChange, error }: FactoryVideoUrlsFieldProps) {
  const [localErrors, setLocalErrors] = useState<Record<number, string>>({});
  const [previewing, setPreviewing] = useState<number | null>(null);

  const updateUrl = (index: number, value: string) => {
    const next = urls.slice();
    next[index] = value;
    onChange(next);
    if (localErrors[index]) {
      setLocalErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const validateUrl = (index: number, value: string) => {
    if (value.trim() && !isValidUrl(value.trim())) {
      setLocalErrors((prev) => ({ ...prev, [index]: "Please enter a valid URL (https://)" }));
    }
  };

  const addRow = () => onChange([...urls, ""]);

  const removeRow = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
    setLocalErrors((prev) => {
      const updated: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = parseInt(k, 10);
        if (n < index) updated[n] = v;
        else if (n > index) updated[n - 1] = v;
      });
      return updated;
    });
    if (previewing === index) setPreviewing(null);
    else if (previewing !== null && previewing > index) setPreviewing(previewing - 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Factory Video URLs</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Add YouTube, Vimeo, Loom or company-hosted URLs. No file upload required.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="shrink-0">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add URL
        </Button>
      </div>

      {urls.length === 0 ? (
        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-sm text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <Plus className="h-4 w-4" />
          Add a factory tour video URL
        </button>
      ) : (
        <div className="space-y-2">
          {urls.map((url, index) => {
            const platform = url.trim() ? detectPlatform(url) : "other";
            const hasError = Boolean(localErrors[index]);
            const embedUrl = url.trim() && isValidUrl(url) ? getEmbedUrl(url, platform) : null;
            const isPreviewing = previewing === index;

            return (
              <div key={index} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-2 p-2.5">
                  {url.trim() ? (
                    <PlatformBadge platform={platform} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                      URL
                    </span>
                  )}
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    onBlur={(e) => validateUrl(index, e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={cn(
                      "min-w-0 flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-slate-400",
                      hasError
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
                    )}
                  />
                  <div className="flex items-center gap-1">
                    {embedUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewing(isPreviewing ? null : index)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                          isPreviewing
                            ? "bg-blue-100 text-blue-700"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        )}
                        title={isPreviewing ? "Hide preview" : "Preview video"}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Remove URL"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {hasError ? (
                  <p className="px-3 pb-2 text-xs text-red-600">{localErrors[index]}</p>
                ) : null}

                {isPreviewing && embedUrl ? (
                  <div className="border-t border-slate-100 p-2">
                    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 h-full w-full rounded-md"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`Video preview ${index + 1}`}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
