import type { MetadataRoute } from "next";
import { brandSiteUrl } from "@/config/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brandSiteUrl();
  const now = new Date();

  const staticRoutes = [
    "",
    "/marketplace",
    "/login",
    "/register",
    "/about",
    "/contact",
    "/capabilities",
    "/products",
    "/suppliers",
    "/rfq/new",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const supabase = createSupabaseServerClient();
  if (!supabase) return entries;

  const [suppliersRes, capabilitiesRes, rfqsRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("capabilities")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("rfqs")
      .select("slug, updated_at")
      .in("status", ["open", "in_review"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  for (const supplier of suppliersRes.data ?? []) {
    entries.push({
      url: `${base}/suppliers/${supplier.slug}`,
      lastModified: supplier.updated_at ? new Date(supplier.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const capability of capabilitiesRes.data ?? []) {
    entries.push({
      url: `${base}/capabilities/${capability.slug}`,
      lastModified: capability.updated_at ? new Date(capability.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const rfq of rfqsRes.data ?? []) {
    if (!rfq.slug) continue;
    entries.push({
      url: `${base}/rfq/${rfq.slug}`,
      lastModified: rfq.updated_at ? new Date(rfq.updated_at) : now,
      changeFrequency: "daily",
      priority: 0.6,
    });
  }

  return entries;
}
