"use client";

import Link from "next/link";
import { Plus, Upload, Search, TrendingUp, Zap } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type SellerHeroHeaderProps = {
  userName?: string;
  leads: number;
  activeQuotes: number;
  pendingListings: number;
  pipelineValue: number;
  healthStatus?: "excellent" | "good" | "needs-attention";
};

const HEALTH_STYLES = {
  excellent: { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "Excellent" },
  good: { bg: "bg-blue-500/15", text: "text-blue-300", label: "Good" },
  "needs-attention": { bg: "bg-amber-500/15", text: "text-amber-300", label: "Needs Attention" },
};

export function SellerHeroHeader({
  userName = "Seller",
  leads,
  activeQuotes,
  pendingListings,
  pipelineValue,
  healthStatus = "excellent",
}: SellerHeroHeaderProps) {
  const health = HEALTH_STYLES[healthStatus];
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <section className="ct-hero-gradient relative overflow-hidden rounded-2xl px-8 py-10 text-white">
      {/* Decorative */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ct-gold/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left */}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-300">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-2 font-outfit text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {userName} 🏭
          </h1>
          <div className={`mt-3 inline-flex items-center gap-2 rounded-full ${health.bg} px-3.5 py-1.5 text-sm font-semibold ${health.text}`}>
            <Zap className="h-3.5 w-3.5" />
            Your business health is {health.label.toLowerCase()}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={leads}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Leads</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={activeQuotes}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Active Quotes</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={pendingListings}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Pending Listings</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-slate-300">₹</span>
              <AnimatedCounter
                value={pipelineValue / 100000}
                suffix="L"
                decimals={1}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Pipeline</span>
            </div>
          </div>
        </div>

        {/* Right: CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <Link href="/dashboard/seller/create" className="ct-btn-gold">
            <Plus className="h-4 w-4" />
            Create Listing
          </Link>
          <Link
            href="/onboarding/seller"
            className="ct-btn-primary !bg-white/10 hover:!bg-white/20"
          >
            <Upload className="h-4 w-4" />
            Upload Certifications
          </Link>
          <Link
            href="/seller/rfqs"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <Search className="h-4 w-4" />
            Browse RFQs
            <TrendingUp className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
