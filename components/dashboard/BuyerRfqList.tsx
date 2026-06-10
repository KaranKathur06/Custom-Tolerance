"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RfqRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  delivery_timeline: string | null;
  quotes?: Array<{ count: number }>;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "success"> = {
  open: "default",
  in_review: "warning",
  quoted: "success",
  closed: "secondary",
  cancelled: "secondary",
};

export function BuyerRfqList({ filter }: { filter?: "open" | "closed" | "all" }) {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inquiries?limit=50");
      const json = await res.json();
      if (json.success) {
        let rows = json.data as RfqRow[];
        if (filter === "open") {
          rows = rows.filter((r) => ["open", "in_review", "quoted"].includes(r.status));
        } else if (filter === "closed") {
          rows = rows.filter((r) => ["closed", "cancelled"].includes(r.status));
        }
        setRfqs(rows);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

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

  if (!rfqs.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ClipboardList className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No RFQs yet</p>
        <Link href="/rfq/new">
          <Button variant="outline" className="mt-4">
            Post requirement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rfqs.map((rfq) => {
        const quoteCount = rfq.quotes?.[0]?.count ?? 0;
        return (
          <div
            key={rfq.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/rfq/${rfq.slug}`} className="font-semibold hover:text-primary">
                  {rfq.title}
                </Link>
                <Badge variant={STATUS_VARIANT[rfq.status] ?? "secondary"}>{rfq.status}</Badge>
                {quoteCount > 0 ? (
                  <Badge variant="outline">{quoteCount} quote{quoteCount !== 1 ? "s" : ""}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Posted {new Date(rfq.created_at).toLocaleDateString("en-IN")}
                {rfq.delivery_timeline ? ` · ${rfq.delivery_timeline}` : ""}
              </p>
            </div>
            <Link href={`/rfq/${rfq.slug}`}>
              <Button variant="outline" size="sm">
                View
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
