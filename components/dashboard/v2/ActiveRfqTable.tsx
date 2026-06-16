"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Eye,
  GitCompare,
  Pause,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RfqRow = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  created_at: string;
  deadline?: string;
  quote_count?: number;
  best_price?: string;
  status: string;
};

type ActiveRfqTableProps = {
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closing: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  expired: "bg-red-50 text-red-600 border-red-200",
};

export function ActiveRfqTable({ className = "" }: ActiveRfqTableProps) {
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/buyer/stats");
        const json = await res.json();
        // Try to pull RFQ list from the stats endpoint or a dedicated one
        if (json.success && json.data?.rfqs) {
          setRfqs(json.data.rfqs);
        }
      } catch {
        // silently fail — component shows empty state
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

  if (!rfqs.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <ExternalLink className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500">No active RFQs yet</p>
        <p className="mt-1 text-xs text-slate-400">Post your first requirement to start receiving quotes</p>
        <Link href="/rfq/new" className="ct-btn-primary mt-4 text-xs">
          Post RFQ
        </Link>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              RFQ
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Category
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Created
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Expires
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Quotes
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Best Price
            </th>
            <th className="pb-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Status
            </th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rfqs.map((rfq) => (
            <tr key={rfq.id} className="ct-grid-row">
              <td className="py-3.5 pr-4">
                <Link
                  href={`/rfq/${rfq.slug}`}
                  className="font-semibold text-ct-navy hover:text-ct-gold transition-colors"
                >
                  {rfq.title}
                </Link>
              </td>
              <td className="py-3.5 pr-4 text-slate-500">
                {rfq.category || "—"}
              </td>
              <td className="py-3.5 pr-4 text-slate-500">
                {new Date(rfq.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td className="py-3.5 pr-4 text-slate-500">
                {rfq.deadline
                  ? new Date(rfq.deadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"}
              </td>
              <td className="py-3.5 pr-4">
                <span className="font-semibold text-ct-navy">
                  {rfq.quote_count ?? 0}
                </span>
              </td>
              <td className="py-3.5 pr-4 font-semibold text-emerald-600">
                {rfq.best_price || "—"}
              </td>
              <td className="py-3.5 pr-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${
                    STATUS_STYLES[rfq.status] || STATUS_STYLES.open
                  }`}
                >
                  {rfq.status}
                </span>
              </td>
              <td className="py-3.5">
                <div className="flex items-center gap-1">
                  <Link href={`/rfq/${rfq.slug}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-ct-navy"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-ct-navy"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-ct-navy"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-ct-navy"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
