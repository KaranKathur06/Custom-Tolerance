"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSupplierOnboardingStatus } from "@/lib/hooks/useSupplierOnboardingStatus";
import { ProfileCompletionBanner } from "@/components/supplier/ProfileCompletionBanner";
import { SupplierVerificationBadges } from "@/components/supplier/SupplierVerificationBadges";
import { SellerHeroHeader } from "@/components/dashboard/v2/SellerHeroHeader";
import { PremiumLeadFeed } from "@/components/dashboard/v2/PremiumLeadFeed";
import { PerformanceMetrics } from "@/components/dashboard/v2/PerformanceMetrics";
import { SellerBusinessInsights } from "@/components/dashboard/v2/SellerBusinessInsights";
import { ActiveOrders } from "@/components/dashboard/v2/ActiveOrders";
import { Button } from "@/components/ui/button";

type SellerStats = {
  leadFeedCount: number;
  inquiries: { total: number; unread: number };
  quotes: {
    submitted: number;
    viewed: number;
    won: number;
    lost: number;
  };
  listings: { active: number; pending: number };
};

export default function SellerCommandCenter() {
  const { sellerProfile, profile, company } = useAuth();
  const { data: onboardingStatus } = useSupplierOnboardingStatus();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userName =
    profile?.full_name?.split(" ")[0] ||
    company?.name?.split(" ")[0] ||
    "Seller";

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/seller/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [sellerProfile?.id]);

  const revenueEstimate = (stats?.quotes.won ?? 0) * 150000;

  return (
    <div className="space-y-8">
      {onboardingStatus && (
        <div className="space-y-4">
          <ProfileCompletionBanner
            percent={onboardingStatus.profileCompletionPercent}
            remainingItems={onboardingStatus.remainingItems}
            onboardingStatus={onboardingStatus.onboardingStatus}
            changeRequestNotes={onboardingStatus.changeRequestNotes}
            marketplaceUnlocked={onboardingStatus.marketplaceUnlocked}
          />
          {onboardingStatus.badges.some((b) => b.earned) ? (
            <SupplierVerificationBadges badges={onboardingStatus.badges} />
          ) : null}
        </div>
      )}

      <SellerHeroHeader
        userName={userName}
        openRfqs={stats?.leadFeedCount ?? 0}
        newInquiries={stats?.inquiries.unread ?? 0}
        quotesSubmitted={
          (stats?.quotes.submitted ?? 0) + (stats?.quotes.viewed ?? 0)
        }
        ordersRunning={stats?.quotes.won ?? 0}
        revenueThisMonth={revenueEstimate}
      />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ct-section-title">New Opportunities</h2>
          <Link href="/seller/rfqs">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Browse All RFQs
            </Button>
          </Link>
        </div>
        <div className="ct-card p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <PremiumLeadFeed />
          )}
        </div>
      </section>

      <PerformanceMetrics
        rfqsParticipated={
          (stats?.quotes.submitted ?? 0) +
          (stats?.quotes.viewed ?? 0) +
          (stats?.quotes.won ?? 0)
        }
        winRate={
          (stats?.quotes.won ?? 0) + (stats?.quotes.lost ?? 0) > 0
            ? Math.round(
                ((stats?.quotes.won ?? 0) /
                  ((stats?.quotes.won ?? 0) + (stats?.quotes.lost ?? 0))) *
                  100,
              )
            : 34
        }
      />

      <SellerBusinessInsights />

      <ActiveOrders />
    </div>
  );
}
