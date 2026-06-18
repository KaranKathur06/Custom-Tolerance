"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketIntelligence } from "@/components/dashboard/v2/MarketIntelligence";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDashboardHref } from "@/lib/marketplace/auth-navigation";

export default function MarketIntelligencePage() {
  const { profile } = useAuth();
  const role =
    profile?.role === "seller" ||
    profile?.role === "manufacturer" ||
    profile?.role === "distributor"
      ? "seller"
      : "buyer";

  const dashboardHref = getDashboardHref(profile?.role ?? "buyer");

  return (
    <div className="container max-w-[1440px] py-8">
      <Link
        href={dashboardHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ct-gold hover:text-ct-gold-light"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="ct-section-title text-3xl">Market Intelligence</h1>
        <p className="mt-1 text-sm text-slate-500">
          Commodity prices, industry trends, and AI-powered market insights
        </p>
      </div>

      <MarketIntelligence role={role} />

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-ct-navy">AI Market Insights</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            "Stainless Steel RFQs increased 24% this month across Gujarat and Maharashtra.",
            "Automotive suppliers are receiving 18% more CNC machining orders.",
            "Aluminium pricing increased 2.3% — consider locking in long-term quotes.",
            "Demand in Gujarat and Maharashtra growing for die casting services.",
          ].map((insight) => (
            <div
              key={insight}
              className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700"
            >
              {insight}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
