import { NextRequest, NextResponse } from "next/server";
import { protectApiRoute } from "@/lib/auth/protect-route";
import {
  loadProfilePrivacySettings,
  saveProfilePrivacySettings,
} from "@/lib/marketplace/profile-privacy-service";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const role = (request.nextUrl.searchParams.get("role") ?? "seller") as "seller" | "buyer";
  const settings = await loadProfilePrivacySettings(auth.supabase, auth.user.id, role);
  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: NextRequest) {
  const auth = await protectApiRoute(request);
  if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const body = await request.json();
  const role = (body.role as "seller" | "buyer") ?? "seller";
  const settings = (body.settings ?? {}) as Record<string, ProfileVisibilityLevel>;

  await saveProfilePrivacySettings(auth.supabase, auth.user.id, role, settings);
  return NextResponse.json({ success: true });
}
