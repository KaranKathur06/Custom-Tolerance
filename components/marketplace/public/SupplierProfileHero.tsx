"use client";

import {
  Factory,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  Globe2,
  Star,
  Package,
  Share2,
} from "lucide-react";
import { SaveSupplierButton } from "@/components/marketplace/SaveSupplierButton";
import { SendInquiryButton } from "@/components/marketplace/SendInquiryModal";

type SupplierProfileHeroProps = {
  supplierId: string;
  supplierSlug: string;
  companyName: string;
  locationLabel: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  foundingYear?: number | string | null;
  employeeCount?: number | null;
  isGstVerified: boolean;
  isVerified: boolean;
  exportCapability: boolean;
  reviewAvg?: number | null;
  reviewCount?: number;
  verifiedOrderCount?: number;
  isSaved?: boolean;
};

export function SupplierProfileHero({
  supplierId,
  supplierSlug,
  companyName,
  locationLabel,
  logoUrl,
  coverImageUrl,
  foundingYear,
  employeeCount,
  isGstVerified,
  isVerified,
  exportCapability,
  reviewAvg,
  reviewCount = 0,
  verifiedOrderCount = 0,
  isSaved,
}: SupplierProfileHeroProps) {
  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: companyName,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Banner */}
      <div className="relative h-56 bg-gradient-to-br from-ct-navy via-slate-800 to-blue-900 md:h-72">
        {coverImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ct-navy/90 via-ct-navy/40 to-transparent" />
          </>
        )}
        {/* Decorative */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ct-gold/8 blur-3xl" />
      </div>

      {/* Content overlay */}
      <div className="container relative z-10 -mt-24 pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Left: Logo + Info */}
          <div className="flex min-w-0 flex-1 gap-5">
            {/* Logo */}
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Factory className="h-12 w-12 text-slate-300" />
              )}
            </div>

            <div className="min-w-0 pb-1">
              {/* Badges */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isGstVerified && (
                  <span className="ct-badge-verified">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    GST Verified
                  </span>
                )}
                {!isGstVerified && isVerified && (
                  <span className="ct-badge-verified">Verified Supplier</span>
                )}
                {exportCapability && (
                  <span className="ct-badge-export">
                    <Globe2 className="h-3.5 w-3.5" />
                    Export Ready
                  </span>
                )}
              </div>

              {/* Company name */}
              <h1 className="font-outfit text-3xl font-bold text-ct-navy md:text-4xl">
                {companyName}
              </h1>

              {/* Location */}
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {locationLabel}
              </p>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-5">
                {/* Rating */}
                {reviewAvg != null && reviewAvg > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(reviewAvg)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-slate-200 text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-ct-navy">
                      {reviewAvg.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({reviewCount} reviews)
                    </span>
                  </div>
                )}

                {foundingYear && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    Since {foundingYear}
                  </span>
                )}
                {employeeCount && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Users className="h-3.5 w-3.5" />
                    {employeeCount}+ employees
                  </span>
                )}
                {verifiedOrderCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Package className="h-3.5 w-3.5" />
                    {verifiedOrderCount}+ Orders
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
            <SendInquiryButton
              supplierId={supplierId}
              supplierName={companyName}
              source="profile"
              className="ct-btn-primary"
            />
            <a
              href={`/rfq/new?supplier=${supplierId}`}
              className="ct-btn-gold text-sm"
            >
              Request Quote
            </a>
            <div className="flex gap-2">
              <SaveSupplierButton
                supplierId={supplierId}
                initialSaved={isSaved}
              />
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
