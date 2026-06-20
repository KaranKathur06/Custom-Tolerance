"use client";

import { cn } from "@/lib/utils";
import { IRFQ_CREATION_METHODS, type IrfqCreationMethod } from "@/lib/marketplace/irfq/types";
import { Lock, Sparkles } from "lucide-react";

type Props = {
  selected: IrfqCreationMethod;
  onSelect: (method: IrfqCreationMethod) => void;
  subscriptionPlan?: "free" | "premium" | "enterprise";
};

export function CreationMethodSelector({ selected, onSelect, subscriptionPlan = "free" }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Create RFQ</h2>
        <p className="mt-1 text-sm text-slate-600">Choose how you want to build your requirement</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {IRFQ_CREATION_METHODS.map((method) => {
          const lockedPremium = method.premium && subscriptionPlan === "free";
          const lockedEnterprise = method.enterprise && subscriptionPlan !== "enterprise";
          const locked = lockedPremium || lockedEnterprise;

          return (
            <button
              key={method.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(method.id)}
              className={cn(
                "relative rounded-xl border px-4 py-3 text-left transition-colors",
                selected === method.id
                  ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                  : "border-slate-200 bg-white hover:border-slate-300",
                locked && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-900">
                  {method.label}
                  {method.id === "ai_quick" || method.id === "conversational" ? (
                    <Sparkles className="ml-1 inline h-4 w-4 text-amber-500" />
                  ) : null}
                </span>
                {locked ? <Lock className="h-4 w-4 shrink-0 text-slate-400" /> : null}
              </div>
              <p className="mt-1 text-xs text-slate-600">{method.description}</p>
              {lockedPremium ? (
                <p className="mt-2 text-xs font-medium text-amber-700">Premium</p>
              ) : null}
              {lockedEnterprise ? (
                <p className="mt-2 text-xs font-medium text-purple-700">Enterprise</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
