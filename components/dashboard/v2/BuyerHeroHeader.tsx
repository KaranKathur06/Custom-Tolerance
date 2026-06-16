"use client";

import Link from "next/link";
import { Plus, Search, Heart, ArrowUpRight, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type BuyerHeroHeaderProps = {
  userName?: string;
  activeRfqs: number;
  quotesAwaiting: number;
  ordersInProduction: number;
  responseRate?: number;
};

export function BuyerHeroHeader({
  userName = "there",
  activeRfqs,
  quotesAwaiting,
  ordersInProduction,
  responseRate = 28,
}: BuyerHeroHeaderProps) {
  return (
    <section className="ct-hero-gradient relative overflow-hidden rounded-2xl px-8 py-10 text-white">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-ct-gold/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Welcome & Stats */}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-300">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-2 font-outfit text-3xl font-bold tracking-tight md:text-4xl">
            Welcome back, {userName} 👋
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={activeRfqs}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Active RFQs</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={quotesAwaiting}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Quotes awaiting</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={ordersInProduction}
                className="text-2xl font-bold text-ct-gold-light"
              />
              <span className="text-sm text-slate-300">Orders in production</span>
            </div>
          </div>

          {responseRate > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-sm font-semibold text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Market response rate ↑ {responseRate}%
            </div>
          )}
        </div>

        {/* Right: CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
          <Link href="/rfq/new" className="ct-btn-gold">
            <Plus className="h-4 w-4" />
            Post RFQ
          </Link>
          <Link
            href="/marketplace?type=suppliers"
            className="ct-btn-primary !bg-white/10 hover:!bg-white/20"
          >
            <Search className="h-4 w-4" />
            Browse Suppliers
          </Link>
          <Link
            href="/dashboard/buyer?tab=saved"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <Heart className="h-4 w-4" />
            Saved Suppliers
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
