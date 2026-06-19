"use client";

import { Globe, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";

type PrivacySummaryProps = {
  summary: {
    public: string[];
    membersOnly: string[];
    private: string[];
  };
  onEditPrivacy?: () => void;
  onComplete?: () => void;
};

export function PrivacySummary({ summary, onEditPrivacy, onComplete }: PrivacySummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Privacy summary</h3>
      <p className="mt-1 text-xs text-slate-500">
        Review what buyers and sellers can see on your public profile before you submit.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <SummaryColumn
          title="Public"
          icon={Globe}
          items={summary.public}
          tone="emerald"
        />
        <SummaryColumn
          title="Members only"
          icon={Users}
          items={summary.membersOnly}
          tone="blue"
        />
        <SummaryColumn
          title="Private"
          icon={Lock}
          items={summary.private}
          tone="slate"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        {onEditPrivacy ? (
          <Button type="button" variant="outline" size="sm" onClick={onEditPrivacy}>
            Edit privacy
          </Button>
        ) : null}
        {onComplete ? (
          <Button type="button" size="sm" onClick={onComplete} className="bg-slate-950 hover:bg-slate-800">
            Complete profile
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SummaryColumn({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: typeof Globe;
  items: string[];
  tone: "emerald" | "blue" | "slate";
}) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50/50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50/50 text-blue-800",
    slate: "border-slate-200 bg-white text-slate-700",
  };

  return (
    <div className={cn("rounded-lg border p-3", toneClasses[tone])}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500">None</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs font-medium">
              <span className="text-emerald-600">✓</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
