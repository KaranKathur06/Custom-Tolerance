/**
 * Supabase client for Route Handlers that can set auth cookies on the response.
 */

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type PendingCookie = { name: string; value: string; options?: CookieOptions };

export function createMutableRouteHandlerSupabaseClient(
  request: NextRequest,
  pendingCookies: PendingCookie[],
): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          pendingCookies.push(cookie);
        });
      },
    },
  });
}

export function jsonResponseWithCookies<T>(
  body: T,
  pendingCookies: PendingCookie[],
  init?: { status?: number },
): NextResponse {
  const response = NextResponse.json(body, { status: init?.status ?? 200 });
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function getSessionFingerprint(request: NextRequest): string {
  const ua = request.headers.get("user-agent") ?? "unknown";
  const ip = getClientIp(request);
  return `${ip}:${ua.slice(0, 64)}`;
}
