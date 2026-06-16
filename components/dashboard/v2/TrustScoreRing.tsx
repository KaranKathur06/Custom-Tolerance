"use client";

import { useEffect, useRef, useState } from "react";

type TrustScoreRingProps = {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
};

export function TrustScoreRing({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 8,
  className = "",
  label = "Trust Score",
}: TrustScoreRingProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(score / maxScore, 1);
  const offset = circumference * (1 - percentage);

  const scoreColor =
    score >= 80 ? "#16A34A" : score >= 50 ? "#C68A2D" : "#EF4444";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animated]);

  return (
    <div ref={ref} className={`ct-trust-ring ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--ct-card-border))"
          strokeWidth={strokeWidth}
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : circumference}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: scoreColor }}
        >
          {score}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}
