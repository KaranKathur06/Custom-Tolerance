import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { RATE_LIMITS } from "@/lib/auth/rate-limiter";
import { assertRfqOwnership } from "@/lib/marketplace/irfq/resolve-buyer";
import { uploadRfqDrawingFile, isAllowedRfqDrawingMime } from "@/lib/marketplace/irfq/files";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);
  const ownership = await assertRfqOwnership(auth.supabase, id, auth.user.id, isAdmin);
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: ownership.message } },
      { status: ownership.status },
    );
  }

  const { data, error } = await auth.supabase
    .from("rfq_files")
    .select(
      "id, file_name, file_type, file_size_bytes, mime_type, virus_scan_status, ai_processing_status, rfq_item_id, created_at",
    )
    .eq("rfq_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await protectApiRoute(request, {
    permissions: ["storage.upload"],
    rateLimit: RATE_LIMITS.FILE_UPLOAD,
  });
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const isAdmin = ["admin", "super_admin", "superadmin", "moderator"].includes(auth.role);
  const ownership = await assertRfqOwnership(auth.supabase, id, auth.user.id, isAdmin);
  if (!ownership.ok) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: ownership.message } },
      { status: ownership.status },
    );
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
  const rfqItemId = (formData.get("rfq_item_id") as string) || null;

  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "No file provided" } },
      { status: 400 },
    );
  }

  if (!isAllowedRfqDrawingMime(file.type, file.name)) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "File type not allowed for RFQ drawings" } },
      { status: 400 },
    );
  }

  try {
    const record = await uploadRfqDrawingFile(auth.supabase, {
      rfqId: id,
      userId: auth.user.id,
      file,
      rfqItemId,
    });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
