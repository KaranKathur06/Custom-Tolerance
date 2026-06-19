import { NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";

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

  const ext = EXTENSIONS[file.type] || (file.name.split(".").pop() || "bin");
  const safeName = `${randomUUID()}.${ext}`;
  const folder = resolveStorageFolder(bucket, documentType, category);
  const storagePath = `${auth.user.id}/${folder}/${safeName}`;

  const fileBuffer = await file.arrayBuffer();
  const fileFingerprint = createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");

  const tableName = bucket === "seller-documents" ? "supplier_documents" : "supplier_media";
  const { data: duplicate } = await auth.supabase
    .from(tableName)
    .select("id, profile_id")
    .eq("file_fingerprint", fileFingerprint)
    .neq("profile_id", auth.user.id)
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
        matchedProfileId: duplicate.profile_id,
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
      { success: false, error: { code: "SERVER_ERROR", message: `Upload failed: ${uploadError.message}` } },
      { status: 500 },
    );
  }

  let fileUrl: string | null = null;
  let signedUrl: string | null = null;

  if (config.public) {
    const { data: publicData } = auth.supabase.storage.from(bucket).getPublicUrl(storagePath);
    fileUrl = publicData?.publicUrl || null;
  } else {
    const { data: signedData, error: signedError } = await auth.supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600);
    if (!signedError && signedData) {
      signedUrl = signedData.signedUrl;
    }
  }

  let record: Record<string, unknown> | null = null;
  let recordError: Error | null = null;

  if (bucket === "seller-documents") {
    const { data, error } = await auth.supabase
      .from("supplier_documents")
      .insert({
        profile_id: auth.user.id,
        document_type: documentType || "unknown",
        file_url: fileUrl,
        storage_path: storagePath,
        bucket_name: bucket,
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: file.name,
        file_fingerprint: fileFingerprint,
        verification_status: "pending",
        document_status: "uploaded",
      })
      .select("id, document_type, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename")
      .single();
    record = data;
    recordError = error ? new Error(error.message) : null;
  } else {
    const { data, error } = await auth.supabase
      .from("supplier_media")
      .insert({
        profile_id: auth.user.id,
        media_type: bucket === "seller-videos" ? "video" : "image",
        category: category || "general",
        file_url: fileUrl,
        storage_path: storagePath,
        bucket_name: bucket,
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: file.name,
        file_fingerprint: fileFingerprint,
      })
      .select("id, media_type, category, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename")
      .single();
    record = data;
    recordError = error ? new Error(error.message) : null;
  }

  if (recordError || !record) {
    await auth.supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: recordError?.message || "Failed to track upload" } },
      { status: 500 },
    );
  }

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: "seller_upload_created",
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
        signedUrl,
        storagePath,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        bucketName: bucket,
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
  const { data: record } = await auth.supabase
    .from(table)
    .select("id, storage_path, profile_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!record) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Upload not found" } },
      { status: 404 },
    );
  }

  if (record.profile_id !== auth.user.id) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Only the owner can delete this upload" } },
      { status: 403 },
    );
  }

  await auth.supabase.storage.from(bucket).remove([record.storage_path]);

  await auth.supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  await logAdminAction(auth.supabase, {
    userId: auth.user.id,
    action: "seller_upload_deleted",
    resource: bucket,
    resourceId: id,
    details: { bucket, storagePath: record.storage_path },
    request,
  });

  return NextResponse.json({ success: true, data: { deleted: true } });
}
