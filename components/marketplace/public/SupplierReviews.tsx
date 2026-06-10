"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupplierReview, SupplierReviewStats } from "@/lib/marketplace/supplier-profile-extended";

type SupplierReviewsProps = {
  supplierId: string;
  supplierSlug: string;
  reviewStats: SupplierReviewStats | null;
  initialReviews: SupplierReview[];
  initialTotal: number;
  pageSize?: number;
};

const DIMENSIONS = [
  { key: "quality_avg" as const, label: "Quality" },
  { key: "delivery_avg" as const, label: "Delivery" },
  { key: "communication_avg" as const, label: "Communication" },
  { key: "pricing_avg" as const, label: "Pricing" },
];

export function SupplierReviews({
  supplierId,
  reviewStats,
  initialReviews,
  initialTotal,
  pageSize = 5,
}: SupplierReviewsProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(initialTotal);

  const stats = reviewStats ?? {
    overall_avg: 0,
    quality_avg: 0,
    delivery_avg: 0,
    communication_avg: 0,
    pricing_avg: 0,
    total_count: 0,
    verified_count: 0,
    rating_distribution: {},
  };

  const hasMore = reviews.length < total;

  async function loadMore() {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/suppliers/${supplierId}/reviews?page=${nextPage}&limit=${pageSize}`,
      );
      const json = await res.json();
      if (json.success) {
        setReviews((prev) => [...prev, ...json.data.reviews]);
        setTotal(json.data.total);
        setPage(nextPage);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!stats.total_count && !reviews.length) {
    return (
      <p className="text-sm text-slate-500">
        No reviews yet. Reviews appear after completed transactions.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-slate-900">
            {Number(stats.overall_avg).toFixed(1)}
          </div>
          <StarRating rating={stats.overall_avg} size="md" />
          <p className="mt-1 text-sm text-slate-500">
            {stats.total_count} review{stats.total_count !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 space-y-2 min-w-[200px]">
          {DIMENSIONS.map(({ key, label }) => (
            <DimensionBar
              key={key}
              label={label}
              value={Number(stats[key])}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore ? (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more reviews"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-medium text-slate-700">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: SupplierReview }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarRating rating={review.overall_rating} />
          {review.is_verified_purchase ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified purchase
            </span>
          ) : null}
        </div>
        <time className="text-xs text-slate-500">
          {new Date(review.created_at).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>

      {review.title ? (
        <h4 className="mt-2 font-semibold text-slate-900">{review.title}</h4>
      ) : null}
      {review.body ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{review.body}</p>
      ) : null}

      {review.response ? (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Supplier response
          </p>
          <p className="mt-1 text-sm text-slate-700">{review.response.body}</p>
        </div>
      ) : null}
    </article>
  );
}
