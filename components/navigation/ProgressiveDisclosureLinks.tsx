"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getCollapseLabel,
  getDefaultVisibleCount,
  getExpandLabel,
  getFeaturedSlugs,
  type DisclosureLayout,
  type DisclosureMenuKind,
} from "@/config/navigation-disclosure";
import { splitDisclosureItems, sortWithFeaturedSlugs } from "@/lib/navigation/disclosure-utils";
import { useIsMobileViewport } from "@/hooks/use-disclosure-visible-count";
import { cn } from "@/lib/utils";

type ProgressiveDisclosureLinksProps<T extends { id: string; slug: string; name: string }> = {
  items: T[];
  hrefPrefix: string;
  kind: DisclosureMenuKind;
  onLinkClick?: () => void;
  renderItem: (item: T) => React.ReactNode;
  gridClassName?: string;
  layout?: DisclosureLayout;
  /** Reset expand state when parent menu closes */
  resetKey?: string | number;
};

export function ProgressiveDisclosureLinks<T extends { id: string; slug: string; name: string }>({
  items,
  hrefPrefix,
  kind,
  onLinkClick,
  renderItem,
  gridClassName,
  layout = "megaMenu",
  resetKey,
}: ProgressiveDisclosureLinksProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobileViewport();
  const panelId = useId();
  const featuredSlugs = getFeaturedSlugs(kind);

  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);

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
        className={cn(
          "grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4",
          gridClassName,
        )}
        aria-live="polite"
      >
        {visible.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}

        {expanded &&
          hidden.map((item) => (
            <div
              key={item.id}
              className="animate-in fade-in slide-in-from-top-1 duration-300"
            >
              {renderItem(item)}
            </div>
          ))}
      </div>

      {hasMore && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 transition-colors hover:text-blue-800"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {isMobile ? "− " : ""}
                {collapseLabel}
              </>
            ) : (
              <>
                {isMobile ? "+ " : ""}
                {expandLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}

      {!expanded && hidden.length > 0 && (
        <nav className="sr-only" aria-label={`All ${kind}`}>
          {hidden.map((item) => (
            <Link key={`seo-${item.id}`} href={`${hrefPrefix}${item.slug}`}>
              {item.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
