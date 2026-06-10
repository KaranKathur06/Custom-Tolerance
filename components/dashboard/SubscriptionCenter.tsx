"use client";

import Link from "next/link";
import { CreditCard, Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";

type SubscriptionCenterProps = {
  trustLevel?: number;
};

export function SubscriptionCenter({ trustLevel = 0 }: SubscriptionCenterProps) {
  const { sellerProfile } = useAuth();

  const plan =
    trustLevel >= 3 ? "Gold" : trustLevel >= 2 ? "Silver" : trustLevel >= 1 ? "Bronze" : "Free";

  const paymentsEnabled = Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_RAZORPAY_ENABLED === "true",
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Current plan based on trust tier and verification
          </p>
        </div>
        <Badge variant={plan === "Gold" ? "warning" : "secondary"}>{plan}</Badge>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Profile completion: {sellerProfile?.profile_completion_percent ?? 0}%
        </li>
        <li className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-400" />
          Trust level: {trustLevel} / 4
        </li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/pricing">
          <Button variant="outline">View plans</Button>
        </Link>
        {paymentsEnabled ? (
          <Link href="/pricing">
            <Button>Upgrade</Button>
          </Link>
        ) : (
          <p className="self-center text-xs text-muted-foreground">
            Online billing activates when Razorpay is configured
          </p>
        )}
      </div>
    </div>
  );
}
