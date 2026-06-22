"use client";

import { CheckCircle2, ArrowUp, Star, Shield, TrendingUp, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type RegistrationCompleteStepProps = {
  form?: Record<string, unknown>;
  completion: { overallPercent: number };
  gate: { canActivate: boolean; missingRequirements: string[] };
  onCompleteProfile: () => void;
  onSkipForNow: () => void;
};

const CAPABILITIES = [
  { icon: CheckCircle2, label: "Create Listings" },
  { icon: CheckCircle2, label: "Receive RFQs" },
  { icon: CheckCircle2, label: "Send Quotations" },
  { icon: CheckCircle2, label: "Appear in Marketplace" },
];

const REWARDS = [
  { icon: TrendingUp, label: "Increase Trust Score" },
  { icon: Shield, label: "Get Verified Badge" },
  { icon: Star, label: "Rank Higher in Search" },
  { icon: Zap, label: "Receive More RFQs" },
  { icon: Eye, label: "Premium Buyer Visibility" },
  { icon: ArrowUp, label: "Advanced Search Ranking" },
];

export function RegistrationCompleteStep({
  gate,
  onCompleteProfile,
  onSkipForNow,
}: RegistrationCompleteStepProps) {
  return (
    <div className="mt-6 space-y-8">
      {/* Celebration Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-950">Registration Complete</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your company account is now active. You can start using the marketplace immediately.
        </p>
      </div>

      {/* Activation Status */}
      {gate.canActivate ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          Your marketplace account is active and ready to use.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">Complete these to activate your account:</p>
          <ul className="mt-2 space-y-1">
            {gate.missingRequirements.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* You Can Now */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            You can now
          </h3>
          <div className="mt-4 space-y-3">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Icon className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Profile To Unlock */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">
            Complete your profile to unlock
          </h3>
          <div className="mt-4 space-y-3">
            {REWARDS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          size="lg"
          className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
          onClick={onCompleteProfile}
        >
          Complete Profile
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onSkipForNow}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
