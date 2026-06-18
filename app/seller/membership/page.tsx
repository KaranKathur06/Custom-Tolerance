"use client";

import Link from "next/link";
import { Crown, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionCenter } from "@/components/dashboard/SubscriptionCenter";
import { useAuth } from "@/components/auth/AuthProvider";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    features: ["5 RFQ responses/month", "Basic profile", "Standard visibility"],
    current: true,
  },
  {
    name: "Professional",
    price: "₹4,999/mo",
    features: [
      "Unlimited RFQ responses",
      "Priority listing",
      "Analytics dashboard",
      "Verified badge",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Dedicated account manager",
      "API access",
      "Custom integrations",
      "Premium placement",
    ],
  },
];

export default function SellerMembershipPage() {
  const { sellerProfile } = useAuth();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="ct-section-title text-3xl">Membership</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upgrade your plan to unlock more visibility and leads
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`ct-card p-6 ${
              plan.highlighted
                ? "border-ct-gold ring-2 ring-ct-gold/20"
                : ""
            }`}
          >
            {plan.highlighted && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-ct-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-ct-gold">
                <Zap className="h-3 w-3" />
                Recommended
              </span>
            )}
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-ct-gold" />
              <h3 className="text-lg font-bold text-ct-navy">{plan.name}</h3>
            </div>
            <p className="mt-2 font-outfit text-2xl font-bold text-ct-navy">
              {plan.price}
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <Button disabled className="mt-6 w-full" variant="outline">
                Current Plan
              </Button>
            ) : (
              <Link href="/membership" className="mt-6 block">
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-ct-gold text-white hover:bg-ct-gold-light"
                      : ""
                  }`}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Upgrade"}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      <SubscriptionCenter trustLevel={sellerProfile?.trust_level ?? 0} />
    </div>
  );
}
