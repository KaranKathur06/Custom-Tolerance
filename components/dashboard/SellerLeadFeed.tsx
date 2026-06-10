"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LeadRow = {
  rfq_id: string;
  title: string;
  slug: string;
  description: string;
  quantity: string | null;
  budget_range: string | null;
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
  match_score: number;
};

export function SellerLeadFeed() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/seller/leads");
        const json = await res.json();
        if (json.success) {
          setLeads(json.data ?? []);
          setMessage(json.meta?.message ?? null);
        }
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

  if (message && !leads.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
  }

  if (!leads.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No matched RFQs right now. Complete your capabilities and location to improve matching.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <div
          key={lead.rfq_id}
          className="rounded-lg border p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{lead.title}</h3>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {lead.match_score}% match
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {lead.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {lead.quantity ? <span>Qty: {lead.quantity}</span> : null}
                {lead.budget_range ? <span>Budget: {lead.budget_range}</span> : null}
                {[lead.city, lead.state].filter(Boolean).join(", ") ? (
                  <span>{[lead.city, lead.state].filter(Boolean).join(", ")}</span>
                ) : null}
              </div>
            </div>
            <Link href={`/rfq/${lead.slug}`}>
              <Button size="sm">Submit quote</Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
