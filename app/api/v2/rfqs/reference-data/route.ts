import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadIrfqReferenceData } from "@/lib/marketplace/irfq/files";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "Supabase not configured" } },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key);
  try {
    const data = await loadIrfqReferenceData(supabase);
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reference data";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
