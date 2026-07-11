/**
 * POST /api/products/images — Upload product image to Supabase Storage
 * DELETE /api/products/images — Remove product image from storage
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Build storage path: user_id/product_id/timestamp_filename
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const safeFilename = `${timestamp}.${ext}`;
  const folder = productId ? `${user.id}/${productId}` : `${user.id}/temp`;
  const path = `${folder}/${safeFilename}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[image upload]", uploadError.message);
    return NextResponse.json(
      { error: uploadError.message || "Upload failed" },
      { status: 500 }
    );
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

  return NextResponse.json({
    url: publicUrl,
    path: uploadData.path,
    size: file.size,
    type: file.type,
  });
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

  const { path } = await req.json().catch(() => ({ path: null }));

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  // Security: ensure path starts with user's id
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await supabase.storage.from(BUCKET).remove([path]);

  if (deleteError) {
    console.error("[image delete]", deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
