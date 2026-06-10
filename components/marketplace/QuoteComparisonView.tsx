"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Check, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ComparisonQuote = {
  id: string;
  price: string | null;
  moq: string | null;
  lead_time: string | null;
  payment_terms: string | null;
  status: string;
  seller_profile_id: string | null;
  seller_profiles?: {
    company_name: string | null;
    verification_status?: string | null;
  } | null;
  supplier?: {
    company_name: string;
    review_avg?: number;
    verification_status?: string;
  } | null;
};

type QuoteComparisonViewProps = {
  quotes: ComparisonQuote[];
  rfqId: string;
  onAction?: () => void;
};

type SortKey = "price" | "moq" | "lead_time" | "rating";

export function QuoteComparisonView({ quotes, onAction }: QuoteComparisonViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...quotes].sort((a, b) => {
      if (sortKey === "rating") {
        return (b.supplier?.review_avg ?? 0) - (a.supplier?.review_avg ?? 0);
      }
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
  }, [quotes, sortKey]);

  async function runAction(quoteId: string, action: "accept" | "reject" | "shortlist" | "view") {
    setLoadingId(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) onAction?.();
    } finally {
      setLoadingId(null);
    }
  }

  if (!quotes.length) {
    return (
      <p className="text-sm text-slate-500">No quotes received yet for this RFQ.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Sort by:</span>
        {(
          [
            ["price", "Price"],
            ["moq", "MOQ"],
            ["lead_time", "Lead time"],
            ["rating", "Rating"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              sortKey === key
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">MOQ</th>
              <th className="px-4 py-3">Lead time</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sorted.map((quote) => {
              const name =
                quote.supplier?.company_name ??
                quote.seller_profiles?.company_name ??
                "Supplier";
              const verified =
                quote.supplier?.verification_status === "verified" ||
                quote.seller_profiles?.verification_status === "approved";
              const rating = quote.supplier?.review_avg ?? 0;

              return (
                <tr key={quote.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
                  <td className="px-4 py-3">{quote.price ?? "—"}</td>
                  <td className="px-4 py-3">{quote.moq ?? "—"}</td>
                  <td className="px-4 py-3">{quote.lead_time ?? "—"}</td>
                  <td className="px-4 py-3">
                    {rating > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {rating.toFixed(1)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {verified ? (
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{quote.payment_terms ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{quote.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {quote.status === "submitted" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loadingId === quote.id}
                          onClick={() => runAction(quote.id, "view")}
                        >
                          View
                        </Button>
                      ) : null}
                      {!["accepted", "rejected"].includes(quote.status) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loadingId === quote.id}
                            onClick={() => runAction(quote.id, "shortlist")}
                          >
                            Shortlist
                          </Button>
                          <Button
                            size="sm"
                            disabled={loadingId === quote.id}
                            onClick={() => runAction(quote.id, "accept")}
                          >
                            {loadingId === quote.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
