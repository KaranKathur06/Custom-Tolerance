import crypto from "crypto";
import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_SESSION_DURATION_HOURS = 4;
export const ADMIN_VERIFIED_COOKIE = "admin_verified";

export function generateAdminSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAdminElevatedSession(
  db: SupabaseClient,
  params: {
    userId: string;
    ipAddress: string;
    userAgent: string | null;
    devicePlatform?: string | null;
    deviceMobile?: string | null;
    maxExpiresAt?: Date;
  },
): Promise<{ sessionToken: string; expiresAt: Date; error?: string }> {
  const sessionToken = generateAdminSessionToken();
  const defaultExpiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const expiresAt =
    params.maxExpiresAt && params.maxExpiresAt < defaultExpiresAt
      ? params.maxExpiresAt
      : defaultExpiresAt;

  const { error } = await db.from("admin_sessions").insert({
    user_id: params.userId,
    session_token: sessionToken,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    device_info: {
      platform: params.devicePlatform || "unknown",
      mobile: params.deviceMobile || "unknown",
    },
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { sessionToken, expiresAt, error: error.message };
  }

  return { sessionToken, expiresAt };
}

export function applyAdminVerifiedCookie(
  response: NextResponse,
  params: {
    sessionToken: string;
    userId: string;
    expiresAt: Date;
    bypass?: boolean;
  },
): void {
  const maxAge = Math.max(0, Math.floor((params.expiresAt.getTime() - Date.now()) / 1000));

  response.cookies.set(
    ADMIN_VERIFIED_COOKIE,
    JSON.stringify({
      token: params.sessionToken,
      userId: params.userId,
      expires: params.expiresAt.getTime(),
      verified: true,
      ...(params.bypass ? { bypass: true } : {}),
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    },
  );
}
