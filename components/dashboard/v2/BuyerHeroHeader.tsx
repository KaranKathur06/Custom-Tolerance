"use client";

import Link from "next/link";
import { Plus, Search, TrendingUp } from "lucide-react";
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
    <section className="ct-hero-compact relative overflow-hidden px-6 py-6 text-white md:px-8 md:py-7">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Welcome & Stats */}
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-300 md:text-sm">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1 font-outfit text-2xl font-bold tracking-tight md:text-3xl">
            Welcome back, {userName} 👋
          </h1>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-5">
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={activeRfqs}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Active RFQs</span>
            </div>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={quotesAwaiting}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Quotes Awaiting</span>
            </div>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={ordersInProduction}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Orders in Production</span>
            </div>
          </div>

          {responseRate > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 md:text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Market Response Rate ↑ {responseRate}%
            </div>
          )}
        </div>

        {/* Right: CTAs */}
        <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col lg:items-end">
          <Link href="/rfq/new" className="ct-btn-gold text-sm">
            <Plus className="h-4 w-4" />
            Post RFQ
          </Link>
          <Link
            href="/marketplace?type=suppliers"
            className="ct-btn-primary !bg-white/10 text-sm hover:!bg-white/20"
          >
            <Search className="h-4 w-4" />
            Browse Suppliers
          </Link>
        </div>
      </div>
    </section>
  );
}
