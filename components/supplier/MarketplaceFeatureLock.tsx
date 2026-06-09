"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type MarketplaceFeatureLockProps = {
  locked: boolean;
  message?: string;
  missingRequirements?: string[];
  children: ReactNode;
};

export function MarketplaceFeatureLock({
  locked,
  message = "Complete your profile to unlock marketplace features.",
  missingRequirements = [],
  children,
}: MarketplaceFeatureLockProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 p-6 backdrop-blur-sm">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="font-medium text-slate-900">{message}</p>
          {missingRequirements.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {missingRequirements.map((req) => (
                <li key={req}>{req}</li>
              ))}
            </ul>
          ) : null}
          <Link href="/onboarding/seller" className="mt-4 inline-block">
            <Button size="sm">Complete Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
