"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type QuoteRow = {
  id: string;
  price: string | null;
  status: string;
  submitted_at: string | null;
  rfqs: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

const COLUMNS = [
  { key: "submitted", label: "Submitted" },
  { key: "viewed", label: "Viewed" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Won" },
  { key: "rejected", label: "Lost" },
] as const;

export function SellerQuotePipeline() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes");
      const json = await res.json();
      if (json.success) setQuotes(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function rfqTitle(row: QuoteRow) {
    const rfq = Array.isArray(row.rfqs) ? row.rfqs[0] : row.rfqs;
    return rfq?.title ?? "RFQ";
  }

  function rfqSlug(row: QuoteRow) {
    const rfq = Array.isArray(row.rfqs) ? row.rfqs[0] : row.rfqs;
    return rfq?.slug;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!quotes.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No quotes submitted yet. Browse the lead feed or RFQ marketplace to quote.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Button
          variant={view === "kanban" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("kanban")}
        >
          Pipeline
        </Button>
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("list")}
        >
          List
        </Button>
      </div>

      {view === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const colQuotes = quotes.filter((q) => {
              if (col.key === "accepted") return q.status === "accepted";
              if (col.key === "rejected") {
                return ["rejected", "withdrawn", "expired"].includes(q.status);
              }
              return q.status === col.key;
            });
            return (
              <div key={col.key} className="rounded-lg border bg-slate-50/50 p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {col.label}
                  <span className="ml-1 text-slate-400">({colQuotes.length})</span>
                </h4>
                <div className="space-y-2">
                  {colQuotes.map((q) => (
                    <div key={q.id} className="rounded-md border bg-white p-2 text-sm">
                      <p className="line-clamp-2 font-medium">{rfqTitle(q)}</p>
                      <p className="text-xs text-muted-foreground">{q.price ?? "—"}</p>
                      {rfqSlug(q) ? (
                        <Link
                          href={`/rfq/${rfqSlug(q)}`}
                          className="mt-1 text-xs text-blue-600 hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{rfqTitle(q)}</p>
                <p className="text-xs text-muted-foreground">
                  {q.price ?? "—"} ·{" "}
                  {q.submitted_at
                    ? new Date(q.submitted_at).toLocaleDateString("en-IN")
                    : "Draft"}
                </p>
              </div>
              <Badge variant="outline">{q.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
