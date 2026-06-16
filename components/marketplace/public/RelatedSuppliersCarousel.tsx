"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SupplierCard } from "@/components/marketplace/SupplierCard";
import type { MarketplaceSupplier } from "@/lib/marketplace/supplier-query";

type RelatedSuppliersCarouselProps = {
  suppliers: MarketplaceSupplier[];
};

export function RelatedSuppliersCarousel({ suppliers }: RelatedSuppliersCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  if (!suppliers.length) return null;

  return (
    <div className="relative">
      {/* Navigation arrows */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute -left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:border-slate-300 hover:shadow-xl"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5 text-slate-600" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute -right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-all hover:border-slate-300 hover:shadow-xl"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5 text-slate-600" />
      </button>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="ct-carousel px-2"
      >
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="w-[320px]">
            <SupplierCard supplier={supplier} />
          </div>
        ))}
      </div>
    </div>
  );
}
