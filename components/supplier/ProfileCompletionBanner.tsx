"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type RemainingItem = { label: string; section: string };

type ProfileCompletionBannerProps = {
  percent: number;
  remainingItems: RemainingItem[];
  onboardingStatus?: string;
  changeRequestNotes?: string | null;
  marketplaceUnlocked?: boolean;
};

export function ProfileCompletionBanner({
  percent,
  remainingItems,
  onboardingStatus,
  changeRequestNotes,
  marketplaceUnlocked = false,
}: ProfileCompletionBannerProps) {
  if (marketplaceUnlocked) return null;

  const showChangeRequest = onboardingStatus === "CHANGES_REQUESTED" && changeRequestNotes;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-950">
              Profile Completion: {percent}%
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Complete your profile to unlock marketplace features.
            </p>

            {showChangeRequest ? (
              <p className="mt-2 rounded-md border border-amber-300 bg-white/60 px-3 py-2 text-sm text-amber-900">
                <span className="font-medium">Admin requested changes:</span> {changeRequestNotes}
              </p>
            ) : null}

            {remainingItems.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-amber-900">
                {remainingItems.slice(0, 5).map((item) => (
                  <li key={`${item.section}-${item.label}`} className="flex items-center gap-2">
                    <span className="text-amber-600">○</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}

            {onboardingStatus === "UNDER_REVIEW" || onboardingStatus === "PROFILE_SUBMITTED" ? (
              <p className="mt-2 text-sm font-medium text-amber-900">
                Your profile is under admin review. Marketplace features unlock after approval.
              </p>
            ) : null}
          </div>
        </div>

        <Link href="/onboarding/seller">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-800">
            Complete Profile
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200">
        <div
          className="h-full rounded-full bg-amber-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
