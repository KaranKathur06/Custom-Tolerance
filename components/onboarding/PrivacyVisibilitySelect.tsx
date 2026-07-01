"use client";

import { Globe, Lock, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileVisibilityLevel } from "@/lib/marketplace/profile-visibility";

const OPTIONS: Array<{
  value: ProfileVisibilityLevel;
  label: string;
  icon: typeof Globe;
}> = [
  { value: "PUBLIC", label: "Public", icon: Globe },
  { value: "MEMBERS_ONLY", label: "Members only", icon: Users },
  {
    value: "VERIFIED_SUPPLIERS",
    label: "Verified suppliers",
    icon: ShieldCheck,
  },
  { value: "PRIVATE", label: "Private", icon: Lock },
];

type PrivacyVisibilitySelectProps = {
  value: ProfileVisibilityLevel;
  onChange: (value: ProfileVisibilityLevel) => void;
  className?: string;
  disabled?: boolean;
};

export function PrivacyVisibilitySelect({
  value,
  onChange,
  className,
  disabled,
}: PrivacyVisibilitySelectProps) {
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[2];
  const Icon = selected.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-medium text-slate-500 shrink-0">
        Visibility
      </span>
      <div className="relative min-w-[140px]">
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as ProfileVisibilityLevel)}
          className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
