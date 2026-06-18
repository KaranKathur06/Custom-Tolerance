"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, Download, Copy, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RfqSummaryCard } from "@/components/marketplace/RfqSummaryCard";
import type { RfqStatus } from "@/lib/marketplace/procurement-workflow";

type RfqRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  quantity: string | null;
  delivery_timeline: string | null;
  visibility_level: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  quotes?: Array<{ count: number }>;
};

const TABS = [
  { id: "draft", label: "Draft" },
  { id: "open", label: "Open" },
  { id: "receiving", label: "Receiving Quotes" },
  { id: "negotiating", label: "Negotiating" },
  { id: "awarded", label: "Awarded" },
  { id: "closed", label: "Closed" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function matchesTab(status: string, tab: TabId): boolean {
  const s = status.toLowerCase();
  switch (tab) {
    case "draft":
      return s === "draft";
    case "open":
      return s === "open" || s === "active";
    case "receiving":
      return s === "receiving_quotes" || s === "open";
    case "negotiating":
      return s === "negotiating" || s === "closing";
    case "awarded":
      return s === "awarded" || s === "accepted";
    case "closed":
      return s === "closed" || s === "expired";
    default:
      return true;
  }
}

export default function BuyerRfqsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "open";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/inquiries?limit=100");
        const result = await response.json();
        if (!response.ok) {
          setError(result.error?.message ?? "Failed to load RFQs");
          return;
        }
        setRfqs(result.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load RFQs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return rfqs.filter((rfq) => {
      const matchesSearch =
        !search ||
        rfq.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = matchesTab(rfq.status, activeTab);
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, search, activeTab]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ct-section-title text-3xl">RFQs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage requirements across all procurement stages
          </p>
        </div>
        <Link href="/rfq/new">
          <Button className="gap-1.5 bg-ct-navy font-bold text-white hover:bg-ct-navy-light">
            <Plus className="h-4 w-4" />
            Post RFQ
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-ct-navy text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search RFQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-ct-navy focus:outline-none focus:ring-1 focus:ring-ct-navy"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" disabled>
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-sm text-slate-500">No RFQs in this category</p>
          <Link href="/rfq/new" className="mt-4 inline-block">
            <Button>Post your first RFQ</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rfq) => {
            const location = [rfq.city, rfq.state, rfq.country]
              .filter(Boolean)
              .join(", ");
            const quoteCount = rfq.quotes?.[0]?.count ?? 0;

            return (
              <div key={rfq.id} className="group relative">
                <RfqSummaryCard
                  href={`/rfq/${rfq.slug}`}
                  title={rfq.title}
                  status={(rfq.status as RfqStatus) ?? "open"}
                  visibilityLevel={rfq.visibility_level}
                  quantity={rfq.quantity}
                  deliveryTimeline={rfq.delivery_timeline}
                  locationLabel={location || undefined}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-xs text-slate-500">
                    {quoteCount} supplier quotes received
                  </p>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled>
                      <Copy className="h-3 w-3" />
                      Duplicate
                    </Button>
                    <Link href={`/buyer/quotes?rfq=${rfq.slug}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View Quotes
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
