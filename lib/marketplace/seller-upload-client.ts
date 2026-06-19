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

/** Safe JSON parse — never throws on empty / non-JSON bodies */
async function safeParseJson<T>(response: Response): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await response.text();
    if (!text) return { data: null, error: null };
    const parsed = JSON.parse(text);
    return { data: parsed as T, error: null };
  } catch {
    return { data: null, error: "Invalid response from server." };
  }
}

/** Classify HTTP errors into user-friendly messages */
export function friendlyHttpError(status: number): string {
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 413) return "The file is too large to upload.";
  if (status >= 500) return "Something went wrong on our end. Please try again in a few minutes.";
  if (status >= 400) return "Unable to process your request. Please check your input and try again.";
  return "Something went wrong. Please try again.";
}

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

  let response: Response;
  try {
    response = await fetch("/api/onboarding/seller/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new Error("Unable to connect to server. Please check your internet connection.");
  }

  const { data: payload } = await safeParseJson<{ success?: boolean; data?: UploadResult; error?: { message?: string } }>(response);

  if (!response.ok || !payload?.success) {
    const serverMessage = payload?.error?.message;
    throw new Error(serverMessage || friendlyHttpError(response.status));
  }

  return payload.data as UploadResult;
}

export async function deleteSellerUpload(id: string, bucket: "seller-documents" | "seller-images" | "seller-videos"): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/onboarding/seller/upload?id=${encodeURIComponent(id)}&bucket=${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to server. Please check your internet connection.");
  }

  const { data: payload } = await safeParseJson<{ success?: boolean; error?: { message?: string } }>(response);

  if (!response.ok || !payload?.success) {
    const serverMessage = payload?.error?.message;
    throw new Error(serverMessage || friendlyHttpError(response.status));
  }
}

export async function fetchSellerAssets(includeSigned = false): Promise<{
  documents: Record<string, UploadResult | UploadResult[]>;
  images: Record<string, UploadResult[]>;
  video: UploadResult | null;
}> {
  let response: Response;
  try {
    response = await fetch(`/api/onboarding/seller/assets?signed=${includeSigned ? "true" : "false"}`, {
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to server. Please check your internet connection.");
  }

  const { data: payload } = await safeParseJson<{
    success?: boolean;
    data?: { documents: Record<string, UploadResult | UploadResult[]>; images: Record<string, UploadResult[]>; video: UploadResult | null };
    error?: { message?: string };
  }>(response);

  if (!response.ok || !payload?.success) {
    const serverMessage = payload?.error?.message;
    throw new Error(serverMessage || friendlyHttpError(response.status));
  }

  return payload.data as {
    documents: Record<string, UploadResult | UploadResult[]>;
    images: Record<string, UploadResult[]>;
    video: UploadResult | null;
  };
}
