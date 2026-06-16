"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Clock,
  Send,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SavedSupplier = {
  id: string;
  company_name: string;
  slug: string;
  logo_url?: string | null;
  city?: string | null;
  state?: string | null;
  verification_status?: string | null;
  response_rate?: number | null;
  capabilities?: Array<{ name: string; slug: string }>;
  trust_score?: number;
  recent_activity?: string | null;
};

type SavedSuppliersGridProps = {
  className?: string;
};

export function SavedSuppliersGrid({ className = "" }: SavedSuppliersGridProps) {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/buyer/stats");
        const json = await res.json();
        if (json.success && json.data?.savedSuppliersList) {
          setSuppliers(json.data.savedSuppliersList);
        }
      } catch {
        // silent
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

  if (!suppliers.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm font-medium text-slate-500">
          No saved suppliers yet
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Browse the marketplace to find and save suppliers
        </p>
        <Link href="/marketplace?type=suppliers" className="ct-btn-primary mt-4 text-xs">
          Browse Suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {suppliers.map((supplier, i) => (
        <div
          key={supplier.id}
          className="ct-card p-5 opacity-0 animate-ct-fade-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* Header with logo */}
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {supplier.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={supplier.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-slate-400">
                  {supplier.company_name.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/suppliers/${supplier.slug}`}
                className="text-sm font-bold text-ct-navy hover:text-ct-gold transition-colors truncate block"
              >
                {supplier.company_name}
              </Link>
              {(supplier.city || supplier.state) && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {[supplier.city, supplier.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {supplier.verification_status === "verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            )}
            {supplier.trust_score && supplier.trust_score >= 80 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ct-gold/10 px-2 py-0.5 text-[10px] font-bold text-ct-gold ring-1 ring-ct-gold/20">
                <BadgeCheck className="h-3 w-3" />
                Trusted
              </span>
            )}
          </div>

          {/* Capabilities */}
          {supplier.capabilities && supplier.capabilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {supplier.capabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap.slug}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                >
                  {cap.name}
                </span>
              ))}
              {supplier.capabilities.length > 3 && (
                <span className="text-[10px] text-slate-400">
                  +{supplier.capabilities.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {supplier.response_rate != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {supplier.response_rate}% response
              </span>
            )}
            {supplier.recent_activity && (
              <span className="truncate text-slate-400">
                {supplier.recent_activity}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <Link href={`/suppliers/${supplier.slug}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                <ExternalLink className="h-3 w-3" />
                View Profile
              </Button>
            </Link>
            <Link href={`/rfq/new?supplier=${supplier.id}`} className="flex-1">
              <Button size="sm" className="w-full gap-1 bg-ct-navy text-xs text-white hover:bg-ct-navy-light">
                <Send className="h-3 w-3" />
                Send RFQ
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
