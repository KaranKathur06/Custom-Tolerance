import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ADMIN_REVIEW_ACCESS_MARKER,
  getAdminReviewAccessConfiguration,
} from "@/lib/auth/admin-review-access";
import { isAdminReviewAccessKeyValid } from "@/lib/auth/admin-review-bootstrap";
import {
  applyAdminVerifiedCookie,
  createAdminElevatedSession,
} from "@/lib/auth/admin-session";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REVIEW_DESTINATION = "/ops/admin?review=active";
const REVIEW_RATE_LIMIT = {
  action: "admin_review_access",
  maxAttempts: 8,
  windowMinutes: 15,
  blockMinutes: 30,
};

type PendingCookie = { name: string; value: string; options: CookieOptions };

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function jsonResponse(body: Record<string, unknown>, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function deniedResponse(status = 403): NextResponse {
  return jsonResponse(
    { success: false, error: "Temporary review access is unavailable" },
    status,
  );
}

async function findUserByEmail(
  serviceRole: SupabaseClient,
  email: string,
): Promise<User | null> {
  let page = 1;

  while (true) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (!data.nextPage) return null;
    page = data.nextPage;
  }
}

async function provisionReviewer(
  serviceRole: SupabaseClient,
  email: string,
  expiresAt: Date,
): Promise<User> {
  let reviewer = await findUserByEmail(serviceRole, email);

  if (reviewer && reviewer.app_metadata?.review_access !== ADMIN_REVIEW_ACCESS_MARKER) {
    throw new Error("Reviewer account conflict");
  }

  if (!reviewer) {
    const { data, error } = await serviceRole.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: {
        role: "super_admin",
        review_access: ADMIN_REVIEW_ACCESS_MARKER,
        review_expires_at: expiresAt.toISOString(),
      },
      user_metadata: { full_name: "Claude Admin Reviewer" },
    });
    if (error || !data.user) {
      // A concurrent first request may have created the account.
      reviewer = await findUserByEmail(serviceRole, email);
      if (!reviewer || reviewer.app_metadata?.review_access !== ADMIN_REVIEW_ACCESS_MARKER) {
        throw error ?? new Error("Reviewer account could not be created");
      }
    } else {
      reviewer = data.user;
    }
  }

  const { data: updated, error: updateError } = await serviceRole.auth.admin.updateUserById(
    reviewer.id,
    {
      email_confirm: true,
      app_metadata: {
        ...reviewer.app_metadata,
        role: "super_admin",
        review_access: ADMIN_REVIEW_ACCESS_MARKER,
        review_expires_at: expiresAt.toISOString(),
      },
    },
  );
  if (updateError || !updated.user) throw updateError ?? new Error("Reviewer update failed");

  const { error: profileError } = await serviceRole.from("profiles").upsert(
    {
      id: updated.user.id,
      email,
      full_name: "Claude Admin Reviewer",
      role: "super_admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  return updated.user;
}

async function recordBootstrapEvent(
  serviceRole: SupabaseClient,
  request: NextRequest,
  params: { action: string; userId?: string; details?: Record<string, unknown> },
): Promise<void> {
  const { error } = await serviceRole.from("admin_audit_logs").insert({
    user_id: params.userId ?? null,
    action: params.action,
    resource: "admin_review_access",
    details: params.details ?? null,
    severity: params.userId ? "warning" : "info",
    ip_address: getClientIp(request),
    user_agent: request.headers.get("user-agent"),
  });
  if (error && params.userId) throw error;
}

export async function POST(request: NextRequest) {
  const configuration = getAdminReviewAccessConfiguration();
  if (!configuration.active || !configuration.expiresAt) return deniedResponse(503);

  const origin = request.headers.get("origin");
  if (
    origin !== request.nextUrl.origin ||
    !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
  ) {
    return deniedResponse();
  }

  const serviceRole = createSupabaseServiceRoleClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceRole || !supabaseUrl || !supabaseAnonKey) return deniedResponse(503);

  const ipAddress = getClientIp(request);
  const rateLimit = await checkRateLimit(
    serviceRole,
    ipAddress,
    REVIEW_RATE_LIMIT.action,
    REVIEW_RATE_LIMIT.maxAttempts,
    REVIEW_RATE_LIMIT.windowMinutes,
    REVIEW_RATE_LIMIT.blockMinutes,
  );
  if (!rateLimit.allowed) return deniedResponse(429);

  let body: { key?: unknown };
  try {
    body = (await request.json()) as { key?: unknown };
  } catch {
    return deniedResponse();
  }

  if (!isAdminReviewAccessKeyValid(body.key, configuration.keyHash)) {
    await recordBootstrapEvent(serviceRole, request, {
      action: "ADMIN_REVIEW_ACCESS_DENIED",
      details: { reason: "invalid_credentials" },
    });
    return deniedResponse();
  }

  try {
    const reviewer = await provisionReviewer(
      serviceRole,
      configuration.email,
      configuration.expiresAt,
    );

    const { data: linkData, error: linkError } = await serviceRole.auth.admin.generateLink({
      type: "magiclink",
      email: configuration.email,
    });
    if (linkError || !linkData.properties?.hashed_token) {
      throw linkError ?? new Error("Review sign-in link generation failed");
    }

    const pendingCookies = new Map<string, PendingCookie>();
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => pendingCookies.set(cookie.name, cookie));
        },
      },
    });

    const { data: verification, error: verificationError } = await authClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });
    if (
      verificationError ||
      !verification.user ||
      !verification.session ||
      verification.user.id !== reviewer.id
    ) {
      throw verificationError ?? new Error("Reviewer session verification failed");
    }

    const elevatedSession = await createAdminElevatedSession(serviceRole, {
      userId: reviewer.id,
      ipAddress,
      userAgent: request.headers.get("user-agent"),
      devicePlatform: request.headers.get("sec-ch-ua-platform"),
      deviceMobile: request.headers.get("sec-ch-ua-mobile"),
      maxExpiresAt: configuration.expiresAt,
    });
    if (elevatedSession.error) throw new Error(elevatedSession.error);

    await recordBootstrapEvent(serviceRole, request, {
      action: "ADMIN_REVIEW_ACCESS_ESTABLISHED",
      userId: reviewer.id,
      details: { expires_at: configuration.expiresAt.toISOString() },
    });

    const response = jsonResponse(
      { success: true, destination: REVIEW_DESTINATION },
      200,
    );
    pendingCookies.forEach((cookie) =>
      response.cookies.set(cookie.name, cookie.value, cookie.options),
    );
    applyAdminVerifiedCookie(response, {
      sessionToken: elevatedSession.sessionToken,
      userId: reviewer.id,
      expiresAt: elevatedSession.expiresAt,
    });
    return response;
  } catch {
    await recordBootstrapEvent(serviceRole, request, {
      action: "ADMIN_REVIEW_ACCESS_DENIED",
      details: { reason: "bootstrap_failed" },
    });
    return deniedResponse();
  }
}

