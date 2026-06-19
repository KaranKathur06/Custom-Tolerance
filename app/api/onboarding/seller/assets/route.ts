import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const includeSigned = searchParams.get("signed") === "true";

  const [docsResult, mediaResult] = await Promise.all([
    auth.supabase
      .from("supplier_documents")
      .select("id, document_type, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename, created_at")
      .eq("profile_id", auth.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    auth.supabase
      .from("supplier_media")
      .select("id, media_type, category, file_url, storage_path, bucket_name, mime_type, file_size_bytes, original_filename, created_at")
      .eq("profile_id", auth.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (docsResult.error || mediaResult.error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: docsResult.error?.message || mediaResult.error?.message } },
      { status: 500 },
    );
  }

  const documents: Record<string, unknown> = {};
  for (const doc of docsResult.data ?? []) {
    if (!doc.document_type) continue;
    const key = String(doc.document_type);
    const existing = documents[key];
    const asset = await buildAsset(auth.supabase, doc, includeSigned);
    if (Array.isArray(existing)) {
      existing.push(asset);
    } else if (existing) {
      documents[key] = [existing, asset];
    } else {
      documents[key] = asset;
    }
  }

  const images: Record<string, unknown[]> = {};
  let video: unknown = null;

  for (const media of mediaResult.data ?? []) {
    const asset = await buildAsset(auth.supabase, media, includeSigned);
    if (media.media_type === "video") {
      video = asset;
    } else {
      const key = media.category || "general";
      if (!images[key]) images[key] = [];
      images[key].push(asset);
    }
  }

  return NextResponse.json({
    success: true,
    data: { documents, images, video },
  });
}

async function buildAsset(
  supabase: ReturnType<typeof protectApiRoute> extends Promise<infer T>
    ? T extends { supabase: infer S }
      ? S
      : never
    : never,
  record: Record<string, unknown>,
  includeSigned: boolean,
) {
  const bucket = String(record.bucket_name || "");
  const storagePath = String(record.storage_path || "");
  let signedUrl: string | null = null;

  if (includeSigned && bucket && storagePath) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    signedUrl = data?.signedUrl || null;
  }

  return {
    id: record.id,
    documentType: record.document_type,
    mediaType: record.media_type,
    category: record.category,
    originalFilename: record.original_filename,
    mimeType: record.mime_type,
    fileSize: record.file_size_bytes,
    publicUrl: record.file_url,
    signedUrl,
    storagePath,
    bucketName: bucket,
    createdAt: record.created_at,
  };
}
