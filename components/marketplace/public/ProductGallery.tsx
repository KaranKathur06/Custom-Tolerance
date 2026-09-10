"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import type { ProductMedia } from "@/lib/marketplace/listing-detail";

type ProductGalleryProps = {
  media: ProductMedia[];
  title: string;
};

export function ProductGallery({ media, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const active = media[activeIndex];

  if (media.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
        <span className="flex items-center gap-2"><ImageOff className="h-5 w-5" /> Product media unavailable</span>
      </div>
    );
  }

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + media.length) % media.length);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <Image
            src={active.url}
            alt={`${title} image ${activeIndex + 1}`}
            fill
            priority={activeIndex === 0}
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-contain p-4"
          />
          <button type="button" aria-label="Open product image fullscreen" onClick={() => setIsOpen(true)} className="absolute right-3 top-3 rounded-lg bg-white/90 p-2 text-slate-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </button>
          {media.length > 1 ? (
            <>
              <button type="button" aria-label="Previous product image" onClick={() => move(-1)} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Next product image" onClick={() => move(1)} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm">
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-white">{activeIndex + 1} / {media.length}</span>
            </>
          ) : null}
        </div>
        {media.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product image thumbnails">
            {media.map((image, index) => (
              <button key={`${image.url}-${index}`} type="button" aria-label={`Show product image ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)} className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 ${index === activeIndex ? "border-blue-600" : "border-transparent"}`}>
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {isOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Product image viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setIsOpen(false)}>
          <button type="button" aria-label="Close fullscreen image" onClick={() => setIsOpen(false)} className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white"><X className="h-6 w-6" /></button>
          <Image src={active.url} alt={`${title} image ${activeIndex + 1}`} width={1600} height={1200} className="max-h-[90vh] w-auto max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
