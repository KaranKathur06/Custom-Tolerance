"use client";

import type { ReactNode } from "react";
import { AnimatedCounter } from "./AnimatedCounter";
import { MiniSparkline } from "./MiniSparkline";

type SubMetric = {
  label: string;
  value: string | number;
};

type PremiumMetricCardProps = {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: ReactNode;
  subMetrics?: SubMetric[];
  sparkData?: number[];
  trend?: { value: number; label: string };
  accentColor?: string;
  className?: string;
  delay?: number;
};

export function PremiumMetricCard({
  title,
  value,
  prefix = "",
  suffix = "",
  icon,
  subMetrics = [],
  sparkData,
  trend,
  accentColor = "#C68A2D",
  className = "",
  delay = 0,
}: PremiumMetricCardProps) {
  return (
    <div
      className={`ct-metric-card opacity-0 animate-ct-fade-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
      </div>

      {/* Title */}
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      {/* Main value */}
      <div className="mt-1 flex items-baseline gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          className="text-3xl font-bold text-ct-navy"
          duration={1400}
        />
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-bold ${
              trend.value >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"}
            {Math.abs(trend.value)}%
            <span className="font-normal text-slate-400">{trend.label}</span>
          </span>
        )}
      </div>

      {/* Sub metrics */}
      {subMetrics.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          {subMetrics.map((sub) => (
            <div key={sub.label}>
              <p className="text-[11px] font-medium text-slate-400">
                {sub.label}
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {sub.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
