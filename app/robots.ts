import type { MetadataRoute } from "next";
import { brandSiteUrl } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  const base = brandSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/ops/", "/admin/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
