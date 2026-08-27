"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Eye, FileText, Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteSellerUpload, type UploadResult, uploadSellerFile } from "@/lib/marketplace/seller-upload-client";

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
  onBeforeUpload?: () => Promise<boolean>;
};

export function DocumentUploadField({ label, required, documentType, accept, maxSizeMB, asset, error, onChange, onBeforeUpload }: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`File too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }
    setUploading(true);
    try {
      if (onBeforeUpload && !(await onBeforeUpload())) return;
      const result = await uploadSellerFile(file, "seller-documents", { documentType }, asset?.id);
      onChange(result);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "We couldn't upload this document. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!asset) return;
    setConfirmDelete(false);
    setDeleting(true);
    setLocalError(null);
    try {
      await deleteSellerUpload(asset.id, "seller-documents");
      onChange(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "We couldn't delete this document. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const openSecureDocument = async (download: boolean) => {
    if (!asset) return;
    setViewing(true);
    setLocalError(null);
    try {
      const response = await fetch(`/api/onboarding/seller/documents/${encodeURIComponent(asset.id)}/${download ? "download" : "view"}`, { credentials: "include" });
      const payload = await response.json() as { success?: boolean; url?: string; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.url) throw new Error(payload.error?.message || "This document is no longer available. Please upload it again.");
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "We couldn't open this document. Please try again.");
    } finally {
      setViewing(false);
    }
  };

  const formatAccept = (value: string) => value.split(",").map((item) => item.trim().replace(".", "").toUpperCase()).join(" / ");
  const displaySize = asset ? `${(asset.fileSize / 1024 / 1024).toFixed(2)} MB` : "";

  return (
    <div className={cn("rounded-lg border p-4 transition-colors", asset ? "border-emerald-200 bg-emerald-50/30" : error || localError ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{label}{required ? <span className="text-red-600"> *</span> : null}</span>
        {asset ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{asset.verificationStatus === "approved" ? "Verified" : "Pending review"}</span> : null}
      </div>
      <p className="mb-3 text-xs text-slate-500">{formatAccept(accept)} · Max {maxSizeMB} MB</p>
      {!asset ? (
        <label className={cn("flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-5 transition-colors", uploading ? "border-blue-300 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50")}>
          <input ref={inputRef} type="file" accept={accept} className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <Upload className="h-5 w-5 text-slate-400" />}
          <span className="mt-2 text-sm font-medium text-slate-600">{uploading ? "Uploading..." : "Upload File"}</span>
          <span className="mt-1 text-xs text-slate-400">No file uploaded</span>
        </label>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-white p-3">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50"><FileText className="h-5 w-5 text-emerald-600" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900" title={asset.originalFilename}>{asset.originalFilename}</p><p className="text-xs text-slate-500">{displaySize}{asset.createdAt ? ` · ${new Date(asset.createdAt).toLocaleDateString()}` : ""}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void openSecureDocument(false)} disabled={viewing || deleting}>{viewing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Eye className="mr-1.5 h-4 w-4" />}View</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => void openSecureDocument(true)} disabled={viewing || deleting}><Download className="mr-1.5 h-4 w-4" />Download</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => inputRef.current?.click()} disabled={uploading || deleting}><RefreshCw className="mr-1.5 h-4 w-4" />Replace</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)} disabled={uploading || deleting}>{deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Delete</Button>
          </div>
          {confirmDelete ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3" role="alertdialog" aria-label={`Delete ${label}?`}><p className="text-sm font-semibold text-red-900">Delete {label}?</p><p className="mt-1 text-xs text-red-800">This removes the uploaded document from your profile. You can upload a replacement later.</p><div className="mt-3 flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button type="button" variant="destructive" size="sm" onClick={() => void handleRemove()}>Delete document</Button></div></div> : null}
          <input ref={inputRef} type="file" accept={accept} className="hidden" disabled={uploading || deleting} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
        </div>
      )}
      {(error || localError) ? <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600" role="alert"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error || localError}</span></div> : null}
    </div>
  );
}
