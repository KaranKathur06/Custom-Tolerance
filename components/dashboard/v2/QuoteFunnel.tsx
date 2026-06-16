"use client";

import { useEffect, useRef, useState } from "react";

type FunnelStage = {
  label: string;
  count: number;
  color: string;
};

type QuoteFunnelProps = {
  stages?: FunnelStage[];
  className?: string;
};

const DEFAULT_STAGES: FunnelStage[] = [
  { label: "Sent", count: 24, color: "#3B82F6" },
  { label: "Viewed", count: 18, color: "#8B5CF6" },
  { label: "Negotiation", count: 10, color: "#C68A2D" },
  { label: "Won", count: 6, color: "#16A34A" },
  { label: "Completed", count: 4, color: "#059669" },
];

export function QuoteFunnel({
  stages = DEFAULT_STAGES,
  className = "",
}: QuoteFunnelProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`space-y-2 ${className}`}>
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 20);
        const convRate =
          i > 0 && stages[i - 1].count > 0
            ? ((stage.count / stages[i - 1].count) * 100).toFixed(0)
            : null;

        return (
          <div key={stage.label}>
            {/* Connector */}
            {i > 0 && (
              <div className="flex items-center gap-2 py-1 pl-4">
                <div className="h-4 w-px bg-slate-200" />
                {convRate && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {convRate}% conversion
                  </span>
                )}
              </div>
            )}

            {/* Stage bar */}
            <div className="ct-funnel-stage">
              <div
                className="absolute inset-y-0 left-0 rounded-xl opacity-10"
                style={{
                  backgroundColor: stage.color,
                  width: visible ? `${widthPct}%` : "0%",
                  transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 150}ms`,
                }}
              />
              <div
                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                style={{ backgroundColor: stage.color }}
              >
                {stage.count}
              </div>
              <span className="relative z-10 text-sm font-semibold text-slate-700">
                {stage.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
