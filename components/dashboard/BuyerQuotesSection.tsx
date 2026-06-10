"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { QuoteComparisonView, type ComparisonQuote } from "@/components/marketplace/QuoteComparisonView";

type QuoteGroup = {
  rfq: { id: string; title: string; slug: string; status: string };
  quotes: ComparisonQuote[];
};

export function BuyerQuotesSection() {
  const [groups, setGroups] = useState<QuoteGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/buyer/quotes");
      const json = await res.json();
      if (json.success) {
        setGroups(
          (json.data as QuoteGroup[]).filter((g) => g.quotes.length > 0),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!groups.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No active quotes yet. Post an RFQ to receive supplier quotes.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.rfq.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{group.rfq.title}</h3>
            <Link href={`/rfq/${group.rfq.slug}`} className="text-sm text-blue-600 hover:underline">
              View RFQ
            </Link>
          </div>
          <QuoteComparisonView quotes={group.quotes} rfqId={group.rfq.id} onAction={load} />
        </div>
      ))}
    </div>
  );
}
