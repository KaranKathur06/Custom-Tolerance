"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { GalleryCategory, SupplierGalleryImage } from "@/lib/marketplace/supplier-profile-extended";

const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  factory: "Factory Images",
  machine: "Machine Images",
  product: "Finished Products",
  quality_lab: "Quality Lab",
  certificate: "Certificates",
};

const CATEGORY_ORDER: GalleryCategory[] = [
  "factory",
  "machine",
  "product",
  "quality_lab",
  "certificate",
];

type SupplierGalleryProps = {
  images: SupplierGalleryImage[];
};

export function SupplierGallery({ images }: SupplierGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<GalleryCategory | "all">("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categoriesWithImages = CATEGORY_ORDER.filter((cat) =>
    images.some((img) => img.category === cat),
  );

  if (!images.length) {
    return (
      <p className="text-sm text-slate-500">
        Facility gallery will be updated soon.
      </p>
    );
  }

  const filtered =
    activeCategory === "all"
      ? images
      : images.filter((img) => img.category === activeCategory);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          label="All"
          count={images.length}
        />
        {categoriesWithImages.map((cat) => (
          <TabButton
            key={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            label={CATEGORY_LABELS[cat]}
            count={images.filter((i) => i.category === cat).length}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image_url}
              alt={image.caption ?? CATEGORY_LABELS[image.category]}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
              <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            {image.caption ? (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="truncate text-xs text-white">{image.caption}</p>
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          images={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length))
          }
          onNext={() =>
            setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length))
          }
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      <span className={`ml-1.5 text-xs ${active ? "text-blue-200" : "text-slate-400"}`}>
        {count}
      </span>
    </button>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: SupplierGalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const image = images[index];
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery lightbox"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={onNext}
        className="absolute right-16 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="max-h-[85vh] max-w-5xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image_url}
          alt={image.caption ?? ""}
          className="max-h-[85vh] w-full object-contain"
        />
        {image.caption ? (
          <p className="mt-3 text-center text-sm text-white/80">{image.caption}</p>
        ) : null}
        <p className="mt-1 text-center text-xs text-white/50">
          {index + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
