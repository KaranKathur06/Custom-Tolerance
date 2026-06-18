"use client";

import Link from "next/link";
import {
  Eye,
  Trophy,
  Clock,
  Target,
  Repeat,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type PerformanceMetricsProps = {
  profileViews?: number;
  winRate?: number;
  avgResponseTime?: string;
  quoteSuccessRate?: number;
  repeatBuyers?: number;
  rfqsParticipated?: number;
  conversionRate?: number;
};

export function PerformanceMetrics({
  profileViews = 1240,
  winRate = 34,
  avgResponseTime = "4.2h",
  quoteSuccessRate = 28,
  repeatBuyers = 12,
  rfqsParticipated = 47,
  conversionRate = 18,
}: PerformanceMetricsProps) {
  const metrics = [
    { label: "Profile Views", value: profileViews, icon: Eye, suffix: "" },
    { label: "Win Rate", value: winRate, icon: Trophy, suffix: "%" },
    { label: "Avg Response Time", value: avgResponseTime, icon: Clock, isText: true },
    { label: "Quote Success Rate", value: quoteSuccessRate, icon: Target, suffix: "%" },
    { label: "Repeat Buyers", value: repeatBuyers, icon: Repeat, suffix: "" },
    { label: "RFQs Participated", value: rfqsParticipated, icon: ClipboardList, suffix: "" },
    { label: "Conversion Rate", value: conversionRate, icon: TrendingUp, suffix: "%" },
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="ct-section-title">Performance Metrics</h2>
        <Link
          href="/seller/analytics"
          className="text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
        >
          View Analytics →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="ct-metric-card">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {metric.label}
                </p>
              </div>
              <p className="mt-3 font-outfit text-2xl font-bold text-ct-navy">
                {metric.isText ? (
                  metric.value
                ) : (
                  <>
                    <AnimatedCounter value={metric.value as number} />
                    {metric.suffix}
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
