"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getCollapseLabel,
  getDefaultVisibleCount,
  getExpandLabel,
  getFeaturedSlugs,
  NAVIGATION_DISCLOSURE,
  type DisclosureLayout,
  type DisclosureMenuKind,
} from "@/config/navigation-disclosure";
import { splitDisclosureItems, sortWithFeaturedSlugs } from "@/lib/navigation/disclosure-utils";
import { useIsMobileViewport } from "@/hooks/use-disclosure-visible-count";
import { cn } from "@/lib/utils";

type ProgressiveDisclosureCardsProps<T extends { id: string; slug: string; name: string }> = {
  items: T[];
  kind: DisclosureMenuKind;
  renderCard: (item: T) => React.ReactNode;
  getHref: (item: T) => string;
  gridClassName?: string;
  expandClassName?: string;
  layout?: DisclosureLayout;
};

export function ProgressiveDisclosureCards<T extends { id: string; slug: string; name: string }>({
  items,
  kind,
  renderCard,
  getHref,
  gridClassName = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  expandClassName,
  layout = "cardGrid",
}: ProgressiveDisclosureCardsProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobileViewport();
  const panelId = useId();

  const featuredSlugs = getFeaturedSlugs(kind);

  const sortedItems = useMemo(
    () => sortWithFeaturedSlugs(items, featuredSlugs),
    [items, featuredSlugs],
  );

  const visibleCount = getDefaultVisibleCount(kind, isMobile, layout);
  const { visible, hidden, hasMore } = useMemo(
    () => splitDisclosureItems(sortedItems, visibleCount),
    [sortedItems, visibleCount],
  );

  const expandLabel = getExpandLabel(kind);
  const collapseLabel = getCollapseLabel();

  return (
    <div>
      <div
        id={panelId}
        className={cn(gridClassName, "transition-all duration-300 ease-out")}
        style={{ transitionDuration: `${NAVIGATION_DISCLOSURE.ANIMATION_MS}ms` }}
        aria-live="polite"
      >
        {visible.map((item) => (
          <div key={item.id}>{renderCard(item)}</div>
        ))}

        {expanded &&
          hidden.map((item) => (
            <div
              key={item.id}
              className="animate-in fade-in slide-in-from-top-2 duration-300"
            >
              {renderCard(item)}
            </div>
          ))}
      </div>

      {hasMore && (
        <div className={cn("mt-10 flex justify-center", expandClassName)}>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {isMobile ? "− " : ""}
                {collapseLabel}
              </>
            ) : (
              <>
                {isMobile ? "+ " : ""}
                {expandLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}

      {!expanded && hidden.length > 0 && (
        <nav className="sr-only" aria-label={`All ${kind}`}>
          {hidden.map((item) => (
            <Link key={`seo-${item.id}`} href={getHref(item)}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
