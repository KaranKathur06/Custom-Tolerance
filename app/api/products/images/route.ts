/**
 * POST /api/products/images — Upload product image to Supabase Storage
 * DELETE /api/products/images — Remove product image from storage
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

const BUCKET = "product-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;
  if (!productId) return NextResponse.json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Choose a product draft before uploading images." } }, { status: 400 });

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WEBP` },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
      { status: 400 }
    );
  }

  const { data: product } = await supabase.from("seller_products").select("id, approval_status, is_published").eq("id", productId).eq("profile_id", user.id).maybeSingle();
  if (!product) return NextResponse.json({ success: false, error: { code: "PRODUCT_ACCESS_DENIED", message: "Product draft not found." } }, { status: 404 });
  if (product.is_published || !["draft", "pending_review", "rejected"].includes(product.approval_status)) return NextResponse.json({ success: false, error: { code: "PRODUCT_NOT_EDITABLE", message: "This product can no longer be edited." } }, { status: 409 });

  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("seller_product_id", productId);
  if ((count ?? 0) >= 3) return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_LIMIT_REACHED", message: "A product can have up to three images." } }, { status: 409 });

  // Build an isolated storage path. The service role is never exposed to the browser.
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeFilename = `${crypto.randomUUID()}.${ext}`;
  const folder = `${user.id}/${productId}`;
  const path = `${folder}/${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const service = createSupabaseServiceRoleClient();
  if (!service) return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_STORAGE_UNAVAILABLE", message: "Product image storage is temporarily unavailable." } }, { status: 503 });
  const { data: uploadData, error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[image upload]", uploadError.message);
    return NextResponse.json(
      {
        success: false,
        error: { code: uploadError.message.toLowerCase().includes("bucket") ? "PRODUCT_MEDIA_BUCKET_MISSING" : "PRODUCT_MEDIA_UPLOAD_FAILED", message: "Product image storage is temporarily unavailable." },
      },
      { status: 503 }
    );
  }

  const { data: media, error: mediaError } = await supabase.from("product_images").insert({ seller_product_id: productId, url: uploadData.path, storage_path: uploadData.path, mime_type: file.type, file_size: file.size, display_order: count ?? 0, is_primary: (count ?? 0) === 0 }).select("id, seller_product_id, storage_path, mime_type, file_size, display_order, is_primary").single();
  if (mediaError || !media) {
    await service.storage.from(BUCKET).remove([uploadData.path]);
    console.error("[product media persistence]", mediaError?.message);
    return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_PERSISTENCE_FAILED", message: "Product image could not be saved. Please try again." } }, { status: 503 });
  }
  const { data: signed } = await service.storage.from(BUCKET).createSignedUrl(uploadData.path, 60 * 60);
  return NextResponse.json({ success: true, media: { id: media.id, productId, url: signed?.signedUrl ?? "", storagePath: media.storage_path, mimeType: media.mime_type, size: media.file_size, sortOrder: media.display_order, isPrimary: media.is_primary } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path, productId } = await req.json().catch(() => ({ path: null, productId: null }));

  if (!path || typeof path !== "string" || !productId || typeof productId !== "string") {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  // Security: ensure path starts with user's id
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: product } = await supabase.from("seller_products").select("id").eq("id", productId).eq("profile_id", user.id).maybeSingle();
  if (!product) return NextResponse.json({ success: false, error: { code: "PRODUCT_ACCESS_DENIED", message: "Product draft not found." } }, { status: 404 });
  const { data: media } = await supabase.from("product_images").select("id").eq("seller_product_id", productId).eq("storage_path", path).maybeSingle();
  if (!media) return NextResponse.json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product image not found." } }, { status: 404 });
  const service = createSupabaseServiceRoleClient();
  if (!service) return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_STORAGE_UNAVAILABLE", message: "Product image storage is temporarily unavailable." } }, { status: 503 });
  const { error: deleteError } = await service.storage.from(BUCKET).remove([path]);

  if (deleteError) {
    console.error("[image delete]", deleteError.message);
    return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_UPLOAD_FAILED", message: "Product image could not be deleted." } }, { status: 503 });
  }

  const { error: metadataError } = await supabase.from("product_images").delete().eq("id", media.id);
  if (metadataError) return NextResponse.json({ success: false, error: { code: "PRODUCT_MEDIA_PERSISTENCE_FAILED", message: "Product image could not be removed." } }, { status: 503 });

  return NextResponse.json({ success: true });
}
