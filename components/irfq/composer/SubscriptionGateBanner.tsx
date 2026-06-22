"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { IrfqSubscriptionPlan } from "@/lib/marketplace/irfq/types";

type Props = {
  plan: IrfqSubscriptionPlan;
  rfqsCreated?: number;
  rfqsLimit?: number | null;
};

export function SubscriptionGateBanner({ plan, rfqsCreated = 0, rfqsLimit = 3 }: Props) {
  if (plan !== "free") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
        <span className="flex items-center gap-2 font-medium capitalize">
          <Sparkles className="h-4 w-4" /> {plan} plan active
        </span>
      </div>
    );
  }

  const remaining = rfqsLimit != null ? Math.max(0, rfqsLimit - rfqsCreated) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
      <span>
        Free plan · {remaining ?? "∞"} RFQ{remaining === 1 ? "" : "s"} remaining this month
      </span>
      <Link href="/pricing" className="font-semibold text-blue-600 hover:underline">
        Upgrade to Premium
      </Link>
    </div>
  );
}
