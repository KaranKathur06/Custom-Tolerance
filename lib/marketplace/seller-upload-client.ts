export type UploadResult = {
  id: string;
  documentType?: string;
  mediaType?: string;
  category?: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  publicUrl?: string | null;
  signedUrl?: string | null;
  storagePath: string;
  bucketName: string;
};

export async function uploadSellerFile(
  file: File,
  bucket: "seller-documents" | "seller-images" | "seller-videos",
  metadata: { documentType?: string; category?: string },
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  if (metadata.documentType) formData.append("documentType", metadata.documentType);
  if (metadata.category) formData.append("category", metadata.category);

  const response = await fetch("/api/onboarding/seller/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Upload failed");
  }

  return payload.data as UploadResult;
}

export async function deleteSellerUpload(id: string, bucket: "seller-documents" | "seller-images" | "seller-videos"): Promise<void> {
  const response = await fetch(`/api/onboarding/seller/upload?id=${encodeURIComponent(id)}&bucket=${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Delete failed");
  }
}

export async function fetchSellerAssets(includeSigned = false): Promise<{
  documents: Record<string, UploadResult | UploadResult[]>;
  images: Record<string, UploadResult[]>;
  video: UploadResult | null;
}> {
  const response = await fetch(`/api/onboarding/seller/assets?signed=${includeSigned ? "true" : "false"}`, {
    credentials: "include",
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Failed to load assets");
  }

  return payload.data as {
    documents: Record<string, UploadResult | UploadResult[]>;
    images: Record<string, UploadResult[]>;
    video: UploadResult | null;
  };
}
