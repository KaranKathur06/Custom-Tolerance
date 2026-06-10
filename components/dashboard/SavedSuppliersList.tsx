"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaveSupplierButton } from "@/components/marketplace/SaveSupplierButton";

type SavedRow = {
  id: string;
  created_at: string;
  suppliers: {
    id: string;
    company_name: string;
    slug: string;
    logo_url: string | null;
    city: string;
    state: string;
    verification_status: string;
    review_avg: number;
    response_rate: number;
  } | Array<{
    id: string;
    company_name: string;
    slug: string;
    logo_url: string | null;
    city: string;
    state: string;
    verification_status: string;
    review_avg: number;
    response_rate: number;
  }> | null;
};

export function SavedSuppliersList() {
  const [items, setItems] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/suppliers/saved");
        const json = await res.json();
        if (json.success) setItems(json.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Heart className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No saved suppliers yet</p>
        <Link href="/marketplace?type=suppliers">
          <Button variant="outline" className="mt-4">
            Browse suppliers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => {
        const raw = row.suppliers;
        const s = Array.isArray(raw) ? raw[0] : raw;
        if (!s) return null;
        return (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Heart className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/suppliers/${s.slug}`}
                  className="font-semibold hover:text-primary"
                >
                  {s.company_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[s.city, s.state].filter(Boolean).join(", ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.verification_status === "verified" ? (
                    <Badge variant="success">Verified</Badge>
                  ) : null}
                  {s.review_avg > 0 ? (
                    <Badge variant="outline">{s.review_avg.toFixed(1)} ★</Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/rfq/new?supplier=${s.slug}`}>
                <Button size="sm">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                  RFQ
                </Button>
              </Link>
              <SaveSupplierButton supplierId={s.id} initialSaved className="h-9 px-3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
