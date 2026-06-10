/**
 * Progressive disclosure defaults for marketplace navigation.
 * Admin panel can override these via site_settings later without code changes.
 */

export const NAVIGATION_DISCLOSURE = {
  CAPABILITIES_DEFAULT_VISIBLE: 6,
  INDUSTRIES_DEFAULT_VISIBLE: 6,
  MOBILE_VISIBLE: 4,
  ANIMATION_MS: 300,
  /** Curated top capabilities shown before "View All" */
  FEATURED_CAPABILITY_SLUGS: [
    "casting",
    "forging",
    "cnc-machining",
    "fabrication",
    "sheet-metal",
    "welding",
  ] as const,
  /** Most searched industries shown before "View All" */
  FEATURED_INDUSTRY_SLUGS: [
    "automotive",
    "aerospace",
    "defense",
    "medical",
    "electronics",
    "industrial-machinery",
  ] as const,
} as const;

export type DisclosureMenuKind = "capabilities" | "industries";

export function getDefaultVisibleCount(
  kind: DisclosureMenuKind,
  isMobile: boolean,
): number {
  if (isMobile) return NAVIGATION_DISCLOSURE.MOBILE_VISIBLE;
  return kind === "capabilities"
    ? NAVIGATION_DISCLOSURE.CAPABILITIES_DEFAULT_VISIBLE
    : NAVIGATION_DISCLOSURE.INDUSTRIES_DEFAULT_VISIBLE;
}

export function getExpandLabel(kind: DisclosureMenuKind): string {
  return kind === "capabilities" ? "View All Capabilities" : "View All Industries";
}

export function getCollapseLabel(): string {
  return "Show Less";
}
