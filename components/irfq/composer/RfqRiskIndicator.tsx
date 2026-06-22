"use client";

import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IrfqRiskAssessmentResult } from "@/lib/marketplace/irfq/types";

type Props = {
  assessment: IrfqRiskAssessmentResult | null;
  loading?: boolean;
};

const LEVEL_STYLES = {
  low: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  high: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-900",
    badge: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
};

export function RfqRiskIndicator({ assessment, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Analyzing RFQ success risk…
      </div>
    );
  }

  if (!assessment) return null;

  const styles = LEVEL_STYLES[assessment.riskLevel];
  const Icon = styles.icon;

  return (
    <div className={cn("rounded-xl border px-4 py-4", styles.border, styles.bg)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", styles.text)} />
          <h3 className={cn("font-semibold", styles.text)}>RFQ Success Risk</h3>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase", styles.badge)}>
          {assessment.riskLevel} · {Math.round(assessment.riskScore)}/100
        </span>
      </div>

      <p className={cn("mb-3 text-sm", styles.text)}>
        Estimated supplier pool: <strong>{assessment.supplierPoolSize}</strong> manufacturers
      </p>

      {assessment.factors.length > 0 ? (
        <ul className="mb-3 space-y-1.5 text-sm">
          {assessment.factors.map((factor) => (
            <li key={factor.code} className={cn("flex gap-2", styles.text)}>
              <span>{factor.severity === "high" ? "⚠" : factor.severity === "medium" ? "◆" : "·"}</span>
              <span>{factor.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("mb-3 text-sm", styles.text)}>
          Requirements look achievable. Good chance of receiving competitive quotations.
        </p>
      )}

      {assessment.suggestions.length > 0 ? (
        <div className="rounded-lg border border-white/60 bg-white/50 px-3 py-2">
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Info className="h-3.5 w-3.5" /> Suggestions
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {assessment.suggestions.map((suggestion) => (
              <li key={suggestion}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
