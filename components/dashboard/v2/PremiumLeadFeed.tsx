"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  MapPin,
  Sparkles,
  ArrowRight,
  IndianRupee,
  Package,
  Building2,
} from "lucide-react";
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
  buyer_company?: string;
};

type PremiumLeadFeedProps = {
  className?: string;
};

export function PremiumLeadFeed({ className = "" }: PremiumLeadFeedProps) {
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
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (message && !leads.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-ct-gold/40" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Sparkles className="mb-3 h-8 w-8 text-ct-gold/40" />
        <p className="text-sm font-medium text-slate-500">No matched RFQs right now</p>
        <p className="mt-1 text-xs text-slate-400">
          Complete your capabilities and location to improve matching
        </p>
        <Link href="/onboarding/seller" className="ct-btn-primary mt-4 text-xs">
          Improve Profile
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {leads.map((lead, i) => (
        <div
          key={lead.rfq_id}
          className="ct-lead-card opacity-0 animate-ct-fade-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Lead info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-outfit text-base font-bold text-ct-navy">
                  {lead.title}
                </h3>
                {/* Match score badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    lead.match_score >= 90
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : lead.match_score >= 70
                      ? "bg-ct-gold/10 text-ct-gold ring-1 ring-ct-gold/20"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {lead.match_score}% match
                </span>
              </div>

              <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                {lead.description}
              </p>

              {/* Meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                {lead.buyer_company && (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {lead.buyer_company}
                  </span>
                )}
                {(lead.city || lead.state) && (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {[lead.city, lead.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {lead.quantity && (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Package className="h-3 w-3" />
                    MOQ: {lead.quantity}
                  </span>
                )}
                {lead.budget_range && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                    <IndianRupee className="h-3 w-3" />
                    {lead.budget_range}
                  </span>
                )}
              </div>

              {/* Match bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${lead.match_score}%`,
                      background:
                        lead.match_score >= 90
                          ? "linear-gradient(90deg, #16A34A, #22C55E)"
                          : lead.match_score >= 70
                          ? "linear-gradient(90deg, #C68A2D, #D4A853)"
                          : "#94A3B8",
                    }}
                  />
                </div>
                <span className="shrink-0 text-[10px] font-medium text-slate-400">
                  Capability Match
                </span>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="shrink-0">
              <Link href={`/rfq/${lead.slug}`}>
                <Button className="gap-1.5 bg-ct-navy text-white hover:bg-ct-navy-light">
                  Send Quote
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
