"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProfileCompletionWidgetProps = {
  percent: number;
  role: "buyer" | "seller";
  items?: Array<{ label: string; done: boolean }>;
};

const BUYER_DEFAULT_ITEMS = [
  { label: "Verify email", key: "email" },
  { label: "Add company details", key: "company" },
  { label: "Post first RFQ", key: "rfq" },
  { label: "Save a supplier", key: "saved" },
];

const SELLER_DEFAULT_ITEMS = [
  { label: "Complete business profile", key: "profile" },
  { label: "Upload certifications", key: "certs" },
  { label: "Add factory photos", key: "photos" },
  { label: "Publish first listing", key: "listing" },
];

export function ProfileCompletionWidget({
  percent,
  role,
  items,
}: ProfileCompletionWidgetProps) {
  const defaults = role === "buyer" ? BUYER_DEFAULT_ITEMS : SELLER_DEFAULT_ITEMS;
  const checklist =
    items ??
    defaults.map((item, index) => ({
      label: item.label,
      done: percent >= (index + 1) * 25,
    }));

  const settingsHref = role === "buyer" ? "/onboarding/buyer" : "/onboarding/seller";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Profile completion
          </h3>
          <p className="mt-1 text-2xl font-bold text-slate-900">{percent}%</p>
        </div>
        <Link href={settingsHref}>
          <Button variant="outline" size="sm">
            Complete profile
          </Button>
        </Link>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-slate-600">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-slate-300" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
