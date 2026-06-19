import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server-client";
import {
  loadProfilePrivacySettings,
  saveProfilePrivacySettings,
} from "@/lib/marketplace/profile-privacy-service";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (request.nextUrl.searchParams.get("role") ?? "seller") as "seller" | "buyer";
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const settings = await loadProfilePrivacySettings(supabase, user.id, role);
  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const role = (body.role as "seller" | "buyer") ?? "seller";
  const settings = (body.settings ?? {}) as Record<string, ProfileVisibilityLevel>;

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  await saveProfilePrivacySettings(supabase, user.id, role, settings);
  return NextResponse.json({ success: true });
}
