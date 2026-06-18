"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BuyerHeroHeader } from "@/components/dashboard/v2/BuyerHeroHeader";
import { PendingActionsCards } from "@/components/dashboard/v2/PendingActionsCards";
import { AIProcurementInsights } from "@/components/dashboard/v2/AIProcurementInsights";
import { ActiveRfqTable } from "@/components/dashboard/v2/ActiveRfqTable";

type BuyerStats = {
  openRfqs: number;
  activeQuotes: number;
  ordersRunning: number;
  responseRate?: number;
  expiringRfqs?: number;
  newMatches?: number;
  unreadNotifications: number;
};

export default function BuyerCommandCenter() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userName =
    profile?.full_name?.split(" ")[0] ||
    profile?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/buyer/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <BuyerHeroHeader
        userName={userName}
        activeRfqs={stats?.openRfqs ?? 0}
        quotesAwaiting={stats?.activeQuotes ?? 0}
        ordersInProduction={stats?.ordersRunning ?? 0}
        responseRate={stats?.responseRate ?? 28}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <PendingActionsCards
          quotesAwaiting={stats?.activeQuotes ?? 0}
          expiringRfqs={stats?.expiringRfqs ?? 0}
          newMatches={stats?.newMatches ?? 0}
          unreadMessages={stats?.unreadNotifications ?? 0}
        />
      )}

      <AIProcurementInsights />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ct-section-title">Recent RFQs</h2>
          <Link
            href="/buyer/rfqs"
            className="text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
          >
            View All RFQs →
          </Link>
        </div>
        <div className="ct-card p-6">
          <ActiveRfqTable />
        </div>
      </section>
    </div>
  );
}
