"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  BarChart3,
} from "lucide-react";

type MaterialPrice = {
  name: string;
  trend: "up" | "down" | "stable";
  change: number;
  unit: string;
};

type DemandCategory = {
  name: string;
  level: "high" | "medium" | "low";
};

type MarketIntelligenceProps = {
  role: "buyer" | "seller";
  className?: string;
};

const BUYER_PRICES: MaterialPrice[] = [
  { name: "Mild Steel", trend: "up", change: 4.2, unit: "₹/kg" },
  { name: "Stainless Steel 304", trend: "up", change: 7.1, unit: "₹/kg" },
  { name: "Aluminium 6061", trend: "down", change: 2.8, unit: "₹/kg" },
  { name: "Copper", trend: "down", change: 3.4, unit: "₹/kg" },
  { name: "Brass", trend: "stable", change: 0.3, unit: "₹/kg" },
  { name: "EN8 Steel", trend: "up", change: 5.6, unit: "₹/kg" },
];

const SELLER_DEMAND: DemandCategory[] = [
  { name: "Die Casting", level: "high" },
  { name: "CNC Machining", level: "high" },
  { name: "Forging", level: "high" },
  { name: "Precision Machining", level: "medium" },
  { name: "Sheet Metal", level: "medium" },
  { name: "Injection Molding", level: "low" },
];

const TREND_ICONS = {
  up: <TrendingUp className="h-3.5 w-3.5" />,
  down: <TrendingDown className="h-3.5 w-3.5" />,
  stable: <Minus className="h-3.5 w-3.5" />,
};

const TREND_COLORS = {
  up: "text-red-500 bg-red-50",
  down: "text-emerald-600 bg-emerald-50",
  stable: "text-slate-500 bg-slate-100",
};

const TREND_COLORS_SELLER = {
  up: "text-emerald-600 bg-emerald-50",
  down: "text-red-500 bg-red-50",
  stable: "text-slate-500 bg-slate-100",
};

const DEMAND_COLORS = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function MarketIntelligence({
  role,
  className = "",
}: MarketIntelligenceProps) {
  return (
    <div className={`ct-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-outfit text-lg font-bold text-ct-navy">
            Market Intelligence
          </h3>
          <p className="text-xs text-slate-400">
            {role === "buyer"
              ? "Material price trends this week"
              : "Category demand levels"}
          </p>
        </div>
      </div>

      {role === "buyer" ? (
        <div className="divide-y divide-slate-100">
          {BUYER_PRICES.map((material) => {
            const colors = TREND_COLORS[material.trend];
            return (
              <div
                key={material.name}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-slate-50/50"
              >
                <span className="text-sm font-medium text-slate-700">
                  {material.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${colors}`}
                  >
                    {TREND_ICONS[material.trend]}
                    {material.trend === "stable"
                      ? "Stable"
                      : `${material.change}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6">
          <div className="grid gap-2 sm:grid-cols-2">
            {SELLER_DEMAND.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-2">
                  {category.level === "high" && (
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {category.name}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${
                    DEMAND_COLORS[category.level]
                  }`}
                >
                  {category.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
