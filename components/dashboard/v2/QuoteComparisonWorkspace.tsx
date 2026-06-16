"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, BadgeCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type SupplierQuote = {
  id: string;
  price: string | null;
  moq: string | null;
  lead_time: string | null;
  payment_terms: string | null;
  status: string;
  seller_profile_id: string | null;
  seller_profiles?: { company_name: string | null; verification_status?: string | null } | null;
  supplier?: { company_name: string; review_avg?: number; verification_status?: string } | null;
};

type QuoteGroup = {
  rfq: { id: string; title: string; slug: string; status: string };
  quotes: SupplierQuote[];
};

type QuoteComparisonWorkspaceProps = {
  className?: string;
};

export function QuoteComparisonWorkspace({ className = "" }: QuoteComparisonWorkspaceProps) {
  const [groups, setGroups] = useState<QuoteGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/buyer/quotes");
      const json = await res.json();
      if (json.success) {
        setGroups((json.data as QuoteGroup[]).filter((g) => g.quotes.length > 0));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(quoteId: string, action: "accept" | "shortlist") {
    try {
      await fetch(`/api/quotes/${quoteId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      void load();
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm font-medium text-slate-500">No quotes to compare yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Post an RFQ to start receiving supplier quotes
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {groups.map((group) => (
        <div key={group.rfq.id}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-outfit text-lg font-bold text-ct-navy">
              {group.rfq.title}
            </h3>
            <a
              href={`/rfq/${group.rfq.slug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
            >
              View RFQ <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.quotes.slice(0, 4).map((quote) => {
              const name =
                quote.supplier?.company_name ??
                quote.seller_profiles?.company_name ??
                "Supplier";
              const verified =
                quote.supplier?.verification_status === "verified" ||
                quote.seller_profiles?.verification_status === "approved";
              const rating = quote.supplier?.review_avg ?? 0;

              return (
                <div key={quote.id} className="ct-card p-5">
                  {/* Supplier name + verification */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ct-navy/5 text-sm font-bold text-ct-navy">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ct-navy">
                        {name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {verified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {rating > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <p className="mt-4 text-2xl font-bold text-ct-navy">
                    {quote.price || "—"}
                  </p>

                  {/* Details grid */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Delivery</p>
                      <p className="font-semibold text-slate-700">
                        {quote.lead_time || "On request"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">MOQ</p>
                      <p className="font-semibold text-slate-700">
                        {quote.moq || "On request"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400">Payment</p>
                      <p className="font-semibold text-slate-700">
                        {quote.payment_terms || "On request"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!["accepted", "rejected"].includes(quote.status) && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-ct-navy text-white hover:bg-ct-navy-light"
                        onClick={() => runAction(quote.id, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => runAction(quote.id, "shortlist")}
                      >
                        Negotiate
                      </Button>
                    </div>
                  )}

                  {quote.status === "accepted" && (
                    <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700">
                      ✓ Accepted
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
