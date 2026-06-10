/**
 * Progressive disclosure limits for marketplace navigation.
 * All mega menus derive visible counts from this config.
 * Admin panel can override via site_settings later without code rewrites.
 */

export const MENU_LIMITS = {
  mobile: 4,
  megaMenu: {
    columns: 4,
    rows: 2,
  },
  cardGrid: {
    columns: 3,
    rows: 2,
  },
} as const;

export const NAVIGATION_DISCLOSURE = {
  MOBILE_VISIBLE: MENU_LIMITS.mobile,
  MEGA_MENU_COLUMNS: MENU_LIMITS.megaMenu.columns,
  MEGA_MENU_ROWS: MENU_LIMITS.megaMenu.rows,
  ANIMATION_MS: 300,
  FEATURED_CAPABILITY_SLUGS: [
    "casting",
    "forging",
    "cnc-machining",
    "fabrication",
    "sheet-metal",
    "welding",
    "heat-treatment",
    "surface-finishing",
  ] as const,
  FEATURED_INDUSTRY_SLUGS: [
    "automotive",
    "aerospace",
    "defense",
    "medical",
    "electronics",
    "industrial-machinery",
    "energy",
    "construction",
  ] as const,
  FEATURED_PRODUCT_SLUGS: [
    "raw-materials",
    "steel-products",
    "aluminum-products",
    "pipes-and-tubes",
    "fasteners",
    "industrial-components",
    "fabricated-parts",
    "castings",
  ] as const,
} as const;

export type DisclosureMenuKind = "capabilities" | "industries" | "products";

export type DisclosureLayout = "megaMenu" | "cardGrid";

/**
 * Visible count that always fills complete rows for the given column layout.
 */
export function getVisibleCountForGrid(
  columns: number,
  rows: number,
  isMobile: boolean,
): number {
  if (isMobile) return MENU_LIMITS.mobile;
  return Math.max(1, columns) * Math.max(1, rows);
}

export function getDefaultVisibleCount(
  _kind: DisclosureMenuKind,
  isMobile: boolean,
  layout: DisclosureLayout = "megaMenu",
): number {
  if (isMobile) return MENU_LIMITS.mobile;
  const grid = layout === "megaMenu" ? MENU_LIMITS.megaMenu : MENU_LIMITS.cardGrid;
  return getVisibleCountForGrid(grid.columns, grid.rows, false);
}

export function getFeaturedSlugs(kind: DisclosureMenuKind): readonly string[] {
  switch (kind) {
    case "capabilities":
      return NAVIGATION_DISCLOSURE.FEATURED_CAPABILITY_SLUGS;
    case "industries":
      return NAVIGATION_DISCLOSURE.FEATURED_INDUSTRY_SLUGS;
    case "products":
      return NAVIGATION_DISCLOSURE.FEATURED_PRODUCT_SLUGS;
  }
}

export function getExpandLabel(kind: DisclosureMenuKind): string {
  switch (kind) {
    case "capabilities":
      return "View All Capabilities";
    case "industries":
      return "View All Industries";
    case "products":
      return "View All Products";
  }
}

export function getCollapseLabel(): string {
  return "Show Less";
}
