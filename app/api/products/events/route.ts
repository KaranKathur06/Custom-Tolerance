/**
 * GET /api/products/events
 * Real-time product event stream for sync and notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ events: [] });
  }

  const sinceTimestamp = request.nextUrl.searchParams.get("since") || null;
  const event_type = request.nextUrl.searchParams.get("type") || null;
  const limit = Number(request.nextUrl.searchParams.get("limit") || "50");

  try {
    let query = supabase
      .from("product_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sinceTimestamp) {
      query = query.gt("created_at", sinceTimestamp);
    }

    if (event_type) {
      query = query.eq("event_type", event_type);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[products/events]", error.message);
      return NextResponse.json({ events: [] });
    }

    return NextResponse.json({
      events: events || [],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[products/events]", err);
    return NextResponse.json({ events: [] });
  }
}
