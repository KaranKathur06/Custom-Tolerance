"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ListingRow = {
  id: string;
  title: string;
  slug: string;
  metal_type: string | null;
  moderation_status: string;
  created_at: string;
  seller_profiles: {
    company_name: string | null;
  } | Array<{ company_name: string | null }> | null;
};

export function AdminListingModeration() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [counts, setCounts] = useState({ pending: 0, flagged: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings/pending?status=${status}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setListings(json.data ?? []);
        setCounts(json.meta?.statusCounts ?? { pending: 0, flagged: 0, rejected: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(slug: string, action: "approve" | "reject" | "flag") {
    await fetch(`/api/products/${slug}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pending", "flagged", "rejected"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] ?? 0})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : listings.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Queue empty.</p>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const seller = Array.isArray(listing.seller_profiles)
              ? listing.seller_profiles[0]
              : listing.seller_profiles;
            return (
              <div
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <Link href={`/products/${listing.slug}`} className="font-semibold hover:text-primary">
                    {listing.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {seller?.company_name ?? "Seller"} · {listing.metal_type ?? "—"}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {listing.moderation_status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => moderate(listing.slug, "approve")}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moderate(listing.slug, "flag")}>
                    <Flag className="mr-1 h-3.5 w-3.5" />
                    Flag
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => moderate(listing.slug, "reject")}>
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
