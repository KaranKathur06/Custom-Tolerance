import type { MetadataRoute } from "next";
import { brandSiteUrl } from "@/config/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = brandSiteUrl();
  const now = new Date();
  const routes = [
    "",
    "/marketplace",
    "/login",
    "/register",
    "/about",
    "/contact",
    "/capabilities",
    "/products",
    "/suppliers",
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
