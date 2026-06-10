/**
 * Client-side upload helper for supplier onboarding documents and factory media.
 */
export async function uploadSupplierFile(input: {
  file: File;
  bucket: "verification-docs" | "certifications" | "factory-photos";
  entityType: string;
  entityId?: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("bucket", input.bucket);
  formData.append("entity_type", input.entityType);
  if (input.entityId) {
    formData.append("entity_id", input.entityId);
  }

  const response = await fetch("/api/uploads", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Upload failed");
  }

  const publicUrl = payload.data.publicUrl as string | null;
  if (!publicUrl) {
    throw new Error("Upload succeeded but no public URL returned");
  }

  return {
    publicUrl,
    storagePath: payload.data.storagePath as string,
  };
}
