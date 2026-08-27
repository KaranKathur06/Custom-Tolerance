import { NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import { createDocumentSignedUrl, getOwnedSellerDocument } from "@/lib/marketplace/seller-document-access";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: { code: "DOCUMENT_ACCESS_DENIED", message: "You don't have permission to access this document." } }, { status: auth.status });

  const result = await getOwnedSellerDocument(auth.supabase, auth.user.id, params.id);
  if (result.reason !== "ok" || !result.document) {
    return NextResponse.json({ success: false, error: { code: result.reason === "unauthorized" ? "DOCUMENT_ACCESS_DENIED" : "DOCUMENT_NOT_FOUND", message: result.reason === "unauthorized" ? "You don't have permission to access this document." : "This document is no longer available." } }, { status: result.reason === "unauthorized" ? 403 : 404 });
  }

  const signed = await createDocumentSignedUrl(auth.supabase, auth.user.id, request, result.document, "DOCUMENT_VIEWED");
  if (signed.error) return NextResponse.json({ success: false, error: { code: "DOCUMENT_STORAGE_MISSING", message: "This document is no longer available. Please upload it again." } }, { status: 410 });

  return NextResponse.json({ success: true, url: signed.url, expiresAt: new Date(Date.now() + 300000).toISOString(), mimeType: result.document.mime_type });
}
