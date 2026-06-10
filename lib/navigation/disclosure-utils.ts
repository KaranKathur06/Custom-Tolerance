/**
 * Progressive disclosure helpers — featured-first ordering for navigation surfaces.
 */

export function sortWithFeaturedSlugs<T extends { slug: string }>(
  items: T[],
  featuredSlugs: readonly string[],
): T[] {
  if (items.length === 0) return items;

  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const featured: T[] = [];

  for (const slug of featuredSlugs) {
    const match = bySlug.get(slug);
    if (match) {
      featured.push(match);
      bySlug.delete(slug);
    }
  }

  const remainder = items.filter((item) => bySlug.has(item.slug));
  return [...featured, ...remainder];
}

export function splitDisclosureItems<T>(
  items: T[],
  visibleCount: number,
): { visible: T[]; hidden: T[]; hasMore: boolean } {
  if (items.length <= visibleCount) {
    return { visible: items, hidden: [], hasMore: false };
  }

  return {
    visible: items.slice(0, visibleCount),
    hidden: items.slice(visibleCount),
    hasMore: true,
  };
}
