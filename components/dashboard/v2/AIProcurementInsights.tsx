"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Lightbulb,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

type Insight = {
  type: "warning" | "success" | "hot" | "tip" | "trend";
  message: string;
  action?: { label: string; href: string };
};

type AIProcurementInsightsProps = {
  insights?: Insight[];
  className?: string;
};

const DEMO_INSIGHTS: Insight[] = [
  {
    type: "warning",
    message: "Steel sheet prices increased 7% this week across major suppliers",
    action: { label: "View Trends", href: "/marketplace?type=suppliers&category=steel" },
  },
  {
    type: "success",
    message: "Supplier Precision Forge has responded faster than 92% of vendors this month",
    action: { label: "View Profile", href: "/marketplace?type=suppliers" },
  },
  {
    type: "hot",
    message: "4 new suppliers match your CNC Aluminum RFQ — average quote ₹12,400/unit",
    action: { label: "Review Matches", href: "/buyer/quotes" },
  },
  {
    type: "tip",
    message: "Adding material specifications to your RFQs improves response rate by 35%",
  },
  {
    type: "trend",
    message: "Copper prices trending down 3% — good time to lock in long-term quotes",
  },
];

const ICON_MAP = {
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  hot: <Flame className="h-4 w-4 text-orange-500" />,
  tip: <Lightbulb className="h-4 w-4 text-blue-500" />,
  trend: <TrendingUp className="h-4 w-4 text-violet-500" />,
};

const BG_MAP = {
  warning: "bg-amber-50 border-amber-200",
  success: "bg-emerald-50 border-emerald-200",
  hot: "bg-orange-50 border-orange-200",
  tip: "bg-blue-50 border-blue-200",
  trend: "bg-violet-50 border-violet-200",
};

export function AIProcurementInsights({
  insights = DEMO_INSIGHTS,
  className = "",
}: AIProcurementInsightsProps) {
  return (
    <section
      className={`ct-card overflow-hidden opacity-0 animate-ct-fade-up ${className}`}
      style={{ animationDelay: "400ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-outfit text-lg font-bold text-ct-navy">
              Procurement Insights
            </h2>
            <p className="text-xs text-slate-400">
              AI-powered recommendations for your procurement
            </p>
          </div>
        </div>
        <span className="ct-badge-gold text-[10px]">AI Powered</span>
      </div>

      {/* Insights list */}
      <div className="divide-y divide-slate-100">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-slate-50/50"
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${BG_MAP[insight.type]}`}
            >
              {ICON_MAP[insight.type]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-slate-700">
                {insight.message}
              </p>
              {insight.action && (
                <a
                  href={insight.action.href}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
                >
                  {insight.action.label}
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
