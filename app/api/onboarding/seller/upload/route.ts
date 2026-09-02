import { NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { readBooleanSetting } from "@/lib/settings/policy";

const BUCKET_CONFIG: Record<
  string,
  { maxSize: number; allowedTypes: string[]; public: boolean }
> = {
  "seller-documents": {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
    public: false,
  },
  "seller-images": {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    public: true,
  },
  "seller-videos": {
    maxSize: 500 * 1024 * 1024,
    allowedTypes: ["video/mp4"],
    public: true,
  },
};

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

const DOCUMENT_STORAGE_FOLDERS: Record<string, string> = {
  cancelled_cheque: "bank",
  gst_certificate: "gst",
  pan_card: "pan",
  factory_license: "factory-license",
  iec_certificate: "iec",
  udyam_certificate: "udyam",
  duns_certificate: "duns",
  machine_datasheet: "machines",
  certificate_pdf: "certifications",
  export_po: "export/po",
  export_invoice: "export/invoice",
  export_shipping_bill: "export/shipping-bill",
  export_certificate: "export/certificate",
  proof_of_export: "export",
};

const IMAGE_STORAGE_FOLDERS: Record<string, string> = {
  Exterior: "factory/exterior",
  "Shop Floor": "factory/shop-floor",
  Machines: "machines",
  "QC Department": "factory/qc",
  Warehouse: "warehouse",
  Office: "office",
  machine_photos: "machines",
  certificate_images: "certifications",
};

const DOCUMENT_TYPES = new Set([
  "cancelled_cheque",
  "gst_certificate",
  "pan_card",
  "factory_license",
  "iec_certificate",
  "udyam_certificate",
  "duns_certificate",
  "company_registration_certificate",
]);

function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() || "document";
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "document";
}

function contentMatchesMime(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mimeType === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return mimeType === "video/mp4";
}

function resolveStorageFolder(bucket: string, documentType: string | null, category: string | null): string {
  if (bucket === "seller-documents" && documentType) {
    return DOCUMENT_STORAGE_FOLDERS[documentType] || documentType;
  }
  if (bucket === "seller-images" && category) {
    return IMAGE_STORAGE_FOLDERS[category] || category.toLowerCase().replace(/\s+/g, "-");
  }
  if (bucket === "seller-videos") {
    return category === "machine_videos" ? "machines" : "factory-tour";
  }
  return documentType || category || "general";
}

export async function POST(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Expected multipart form data" } },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string) || "";
  const documentType = (formData.get("documentType") as string) || null;
  const category = (formData.get("category") as string) || null;
  const replaceDocumentId = (formData.get("replaceDocumentId") as string) || null;

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
      { status: 400 },
    );
  }

  const config = BUCKET_CONFIG[bucket];
  if (!config) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: `Invalid bucket: ${bucket}` } },
      { status: 400 },
    );
  }

  const settingKey = bucket === 'seller-images' ? 'image_upload_enabled' : 'document_upload_enabled';
  if (!(await readBooleanSetting(auth.supabase, settingKey, true))) {
    return NextResponse.json({ success: false, error: { code: 'UPLOADS_DISABLED', message: 'This upload type is temporarily unavailable.' } }, { status: 403 });
  }

  const { data: sellerProfile, error: sellerProfileError } = await auth.supabase
    .from("seller_profiles")
    .select("id, company_id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (sellerProfileError || !sellerProfile) {
    return NextResponse.json(
      { success: false, error: { code: "SELLER_PROFILE_REQUIRED", message: "Complete your seller profile before uploading files." } },
      { status: 409 },
    );
  }

  if (file.size > config.maxSize) {
    const maxMB = Math.round(config.maxSize / 1024 / 1024);
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: `File too large. Maximum: ${maxMB}MB` } },
      { status: 400 },
    );
  }

  if (!config.allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: `File type '${file.type}' not allowed for this bucket` } },
      { status: 400 },
    );
  }

  if (bucket === "seller-documents" && (!documentType || !DOCUMENT_TYPES.has(documentType))) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_DOCUMENT_TYPE", message: "This document type is not supported." } },
      { status: 400 },
    );
  }

  const fileBuffer = await file.arrayBuffer();
  if (!contentMatchesMime(new Uint8Array(fileBuffer), file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILE_CONTENT", message: "The file content does not match its declared type." } },
      { status: 400 },
    );
  }

  const ext = EXTENSIONS[file.type] || "bin";
  const safeName = `${randomUUID()}.${ext}`;
  const folder = resolveStorageFolder(bucket, documentType, category);
  const storagePath = `${auth.user.id}/${folder}/${safeName}`;

  const fileFingerprint = createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");

  let replacement: { id: string; storage_path: string | null } | null = null;
  if (replaceDocumentId && bucket === "seller-documents") {
    const { data } = await auth.supabase
      .from("supplier_documents")
      .select("id, storage_path")
      .eq("id", replaceDocumentId)
      .eq("seller_profile_id", sellerProfile.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!data) {
      return NextResponse.json(
        { success: false, error: { code: "DOCUMENT_NOT_FOUND", message: "The document is no longer available." } },
        { status: 404 },
      );
    }
    replacement = data;
  }

  const tableName = bucket === "seller-documents" ? "supplier_documents" : "supplier_media";
  const { data: duplicate } = await auth.supabase
    .from(tableName)
    .select("id, seller_profile_id")
    .eq("file_fingerprint", fileFingerprint)
    .neq("seller_profile_id", sellerProfile.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    await auth.supabase.from("marketplace_risk_signals").insert({
      actor_id: auth.user.id,
      actor_role: "seller",
      resource_type: tableName,
      resource_id: duplicate.id,
      signal_key: "duplicate_upload_fingerprint",
      severity: "medium",
      evidence: {
        fingerprint: fileFingerprint,
        matchedSellerProfileId: duplicate.seller_profile_id,
        bucket,
        path: storagePath,
      },
      status: "open",
    });
  }

  const { error: uploadError } = await auth.supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_UPLOAD_FAILED", message: "We couldn't upload this document. Please try again." } },
      { status: 500 },
    );
  }

  let fileUrl: string | null = null;
  if (config.public) {
    const { data: publicData } = auth.supabase.storage.from(bucket).getPublicUrl(storagePath);
    fileUrl = publicData?.publicUrl || null;
  }

  let record: Record<string, unknown> | null = null;
  let recordError: Error | null = null;

  if (bucket === "seller-documents") {
    const payload = {
        seller_profile_id: sellerProfile.id,
        company_id: sellerProfile.company_id,
        profile_id: auth.user.id,
        document_type: documentType || "unknown",
        file_url: fileUrl || storagePath,
        storage_path: storagePath,
        bucket_name: bucket,
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: sanitizeFilename(file.name),
        file_fingerprint: fileFingerprint,
        created_by: auth.user.id,
        verification_status: "pending",
        review_status: "pending",
        reviewer_id: null,
        reviewed_at: null,
        review_notes: null,
        document_status: replacement ? "replaced" : "uploaded",
        updated_at: new Date().toISOString(),
      };
    const { data, error } = replacement
      ? await auth.supabase.from("supplier_documents").update(payload).eq("id", replacement.id).select("id, document_type, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename, verification_status").single()
      : await auth.supabase.from("supplier_documents").insert(payload).select("id, document_type, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename, verification_status").single();
    record = data;
    recordError = error ? new Error(error.message) : null;
  } else {
    const { data, error } = await auth.supabase
      .from("supplier_media")
      .insert({
        seller_profile_id: sellerProfile.id,
        company_id: sellerProfile.company_id,
        media_type: bucket === "seller-videos" ? "video" : "image",
        category: category || "general",
        file_url: fileUrl || storagePath,
        storage_path: storagePath,
        bucket_name: bucket,
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: file.name,
        file_fingerprint: fileFingerprint,
        created_by: auth.user.id,
      })
      .select("id, media_type, category, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename")
      .single();
    record = data;
    recordError = error ? new Error(error.message) : null;
  }

  if (recordError || !record) {
    await auth.supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_UPLOAD_FAILED", message: "We couldn't save this document. Please try again." } },
      { status: 500 },
    );
  }

  if (replacement?.storage_path) {
    const { error: cleanupError } = await auth.supabase.storage.from(bucket).remove([replacement.storage_path]);
    if (cleanupError) {
      await logAdminAction(auth.supabase, {
        userId: auth.user.id,
        action: "document_storage_cleanup_failed",
        resource: bucket,
        resourceId: String(record.id),
        severity: "warning",
        details: { documentType, reason: "replacement_old_object_cleanup_failed" },
        request,
      });
    }
  }

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: replacement ? "DOCUMENT_REPLACED" : "DOCUMENT_UPLOADED",
    resource: bucket,
    resourceId: String(record.id),
    details: { bucket, storagePath, documentType: documentType || category },
    request,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: record.id,
        documentType: record.document_type,
        mediaType: record.media_type,
        category: record.category,
        publicUrl: fileUrl,
        signedUrl: null,
        storagePath: bucket === "seller-documents" ? "" : storagePath,
        originalFilename: String(record.original_filename || sanitizeFilename(file.name)),
        mimeType: file.type,
        fileSize: file.size,
        bucketName: bucket === "seller-documents" ? "" : bucket,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const bucket = searchParams.get("bucket");

  if (!id || !bucket) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Missing id or bucket" } },
      { status: 400 },
    );
  }

  const table = bucket === "seller-documents" ? "supplier_documents" : "supplier_media";
  const { data: sellerProfile } = await auth.supabase
    .from("seller_profiles")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!sellerProfile) {
    return NextResponse.json(
      { success: false, error: { code: "SELLER_PROFILE_REQUIRED", message: "Seller profile not found" } },
      { status: 409 },
    );
  }

  const { data: record } = await auth.supabase
    .from(table)
    .select("id, storage_path, seller_profile_id")
    .eq("id", id)
    .eq("seller_profile_id", sellerProfile.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!record) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Upload not found" } },
      { status: 404 },
    );
  }

  const { error: storageError } = await auth.supabase.storage.from(bucket).remove([record.storage_path]);
  if (storageError) {
    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: "document_storage_database_mismatch",
      resource: bucket,
      resourceId: id,
      severity: "warning",
      details: { reason: "storage_delete_failed" },
      request,
    });
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_DELETE_FAILED", message: "We couldn't remove this document. Please try again." } },
      { status: 502 },
    );
  }

  const { error: databaseError } = await auth.supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (databaseError) {
    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: "document_storage_database_mismatch",
      resource: bucket,
      resourceId: id,
      severity: "critical",
      details: { reason: "database_archive_failed" },
      request,
    });
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_DELETE_FAILED", message: "The file was removed, but its profile record needs attention. Please contact support." } },
      { status: 502 },
    );
  }

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: "DOCUMENT_DELETED",
    resource: bucket,
    resourceId: id,
    details: { bucket, storagePath: record.storage_path },
    request,
  });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
