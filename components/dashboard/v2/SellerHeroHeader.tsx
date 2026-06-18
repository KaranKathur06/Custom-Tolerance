"use client";

import Link from "next/link";
import { Search, UserCheck, Crown, TrendingUp } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type SellerHeroHeaderProps = {
  userName?: string;
  openRfqs?: number;
  newInquiries?: number;
  quotesSubmitted?: number;
  ordersRunning?: number;
  revenueThisMonth?: number;
};

export function SellerHeroHeader({
  userName = "Seller",
  openRfqs = 0,
  newInquiries = 0,
  quotesSubmitted = 0,
  ordersRunning = 0,
  revenueThisMonth = 0,
}: SellerHeroHeaderProps) {
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <section className="ct-hero-compact relative overflow-hidden px-6 py-6 text-white md:px-8 md:py-7">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-300 md:text-sm">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1 font-outfit text-2xl font-bold tracking-tight md:text-3xl">
            {greeting}, {userName} 🏭
          </h1>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-5">
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={openRfqs}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Open RFQs</span>
            </div>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={newInquiries}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">New Inquiries</span>
            </div>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={quotesSubmitted}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Quotes Submitted</span>
            </div>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex items-baseline gap-1.5">
              <AnimatedCounter
                value={ordersRunning}
                className="text-xl font-bold text-ct-gold-light md:text-2xl"
              />
              <span className="text-xs text-slate-300 md:text-sm">Orders Running</span>
            </div>
            {revenueThisMonth > 0 && (
              <>
                <div className="hidden h-6 w-px bg-white/20 sm:block" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-slate-300 md:text-sm">₹</span>
                  <AnimatedCounter
                    value={revenueThisMonth / 100000}
                    suffix="L"
                    decimals={1}
                    className="text-xl font-bold text-ct-gold-light md:text-2xl"
                  />
                  <span className="text-xs text-slate-300 md:text-sm">Revenue</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 md:text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            Business performance trending up
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col lg:items-end">
          <Link href="/seller/rfqs" className="ct-btn-gold text-sm">
            <Search className="h-4 w-4" />
            Browse RFQs
          </Link>
          <Link
            href="/onboarding/seller"
            className="ct-btn-primary !bg-white/10 text-sm hover:!bg-white/20"
          >
            <UserCheck className="h-4 w-4" />
            Complete Profile
          </Link>
          <Link
            href="/seller/membership"
            className="ct-btn-primary !bg-white/10 text-sm hover:!bg-white/20"
          >
            <Crown className="h-4 w-4" />
            Upgrade Membership
          </Link>
        </div>
      </div>
    </section>
  );
}
