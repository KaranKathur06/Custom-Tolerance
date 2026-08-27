import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAction } from "@/lib/auth/protect-route";

export type SellerDocumentAccess = {
  id: string;
  document_type: string;
  storage_path: string | null;
  bucket_name: string | null;
  mime_type: string | null;
  original_filename: string | null;
};

export async function getOwnedSellerDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<{ document: SellerDocumentAccess | null; reason: "not_found" | "unauthorized" | "ok" }> {
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!sellerProfile) return { document: null, reason: "unauthorized" };

  const { data: document } = await supabase
    .from("supplier_documents")
    .select("id, document_type, storage_path, bucket_name, mime_type, original_filename")
    .eq("id", documentId)
    .eq("seller_profile_id", sellerProfile.id)
    .is("deleted_at", null)
    .maybeSingle();

  return document
    ? { document, reason: "ok" }
    : { document: null, reason: "not_found" };
}

export async function createDocumentSignedUrl(
  supabase: SupabaseClient,
  userId: string,
  request: Request,
  document: SellerDocumentAccess,
  action: "DOCUMENT_VIEWED" | "DOCUMENT_DOWNLOADED",
) {
  if (!document.storage_path || document.bucket_name !== "seller-documents") {
    return { url: null, error: "missing_storage" as const };
  }

  const { data, error } = await supabase.storage
    .from(document.bucket_name)
    .createSignedUrl(document.storage_path, 300);

  if (error || !data?.signedUrl) {
    await logAdminAction(supabase, {
      userId,
      action: "document_storage_missing",
      resource: document.bucket_name,
      resourceId: document.id,
      severity: "warning",
      details: { documentType: document.document_type },
      request,
    });
    return { url: null, error: "missing_storage" as const };
  }

  await logAdminAction(supabase, {
    userId,
    action,
    resource: "supplier_documents",
    resourceId: document.id,
    details: { documentType: document.document_type },
    request,
  });

  return { url: data.signedUrl, error: null };
}
