import type { MetadataRoute } from "next";
import { BRAND, brandSiteUrl } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: `${BRAND.name} — ${BRAND.tagline}`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a8a",
  };
}
