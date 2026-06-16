"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  FileText,
  Package,
  Users,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BuyerHeroHeader } from "@/components/dashboard/v2/BuyerHeroHeader";
import { PremiumMetricCard } from "@/components/dashboard/v2/PremiumMetricCard";
import { AIProcurementInsights } from "@/components/dashboard/v2/AIProcurementInsights";
import { ActiveRfqTable } from "@/components/dashboard/v2/ActiveRfqTable";
import { QuoteComparisonWorkspace } from "@/components/dashboard/v2/QuoteComparisonWorkspace";
import { SavedSuppliersGrid } from "@/components/dashboard/v2/SavedSuppliersGrid";
import { GroupedNotifications } from "@/components/dashboard/v2/GroupedNotifications";
import { DashboardSectionNav } from "@/components/dashboard/v2/DashboardSectionNav";
import { ProfileCompletionWidget } from "@/components/dashboard/ProfileCompletionWidget";
import { MarketIntelligence } from "@/components/dashboard/v2/MarketIntelligence";
import { CalendarWidget } from "@/components/dashboard/v2/CalendarWidget";
import { MessageInbox } from "@/components/marketplace/MessageInbox";

type BuyerStats = {
  rfqCount: number;
  openRfqs: number;
  closedRfqs: number;
  expiringRfqs?: number;
  responseRate?: number;
  quotesReceived: number;
  activeQuotes: number;
  acceptedQuotes?: number;
  avgPriceDiff?: number;
  ordersRunning?: number;
  ordersCompleted?: number;
  ordersDelayed?: number;
  spendThisMonth?: number;
  savedSuppliers: number;
  verifiedSuppliers?: number;
  newMatches?: number;
  unreadNotifications: number;
  profileCompletion: number;
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "insights", label: "AI Insights" },
  { id: "rfqs", label: "Active RFQs" },
  { id: "quotes", label: "Quotes" },
  { id: "suppliers", label: "Saved Suppliers" },
  { id: "market", label: "Market" },
  { id: "calendar", label: "Calendar" },
  { id: "messages", label: "Messages" },
  { id: "notifications", label: "Notifications" },
];

// Demo sparkline data for when real data isn't available
const SPARK_RFQS = [3, 5, 4, 7, 6, 8, 9];
const SPARK_QUOTES = [8, 12, 10, 15, 14, 18, 20];
const SPARK_ORDERS = [2, 3, 2, 4, 3, 5, 4];
const SPARK_SUPPLIERS = [5, 7, 8, 10, 12, 14, 16];

export default function BuyerDashboardContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userName = profile?.full_name?.split(" ")[0] || profile?.email?.split("@")[0] || "there";

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

  // Scroll to section from URL hash
  useEffect(() => {
    const section = searchParams.get("section");
    if (section) {
      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[hsl(var(--ct-bg))]">
      {/* Hero */}
      <div className="container pt-6 pb-2">
        <BuyerHeroHeader
          userName={userName}
          activeRfqs={stats?.openRfqs ?? 0}
          quotesAwaiting={stats?.activeQuotes ?? 0}
          ordersInProduction={stats?.ordersRunning ?? 0}
          responseRate={stats?.responseRate ?? 28}
        />
      </div>

      {/* Sticky Nav */}
      <div className="mt-6">
        <DashboardSectionNav sections={SECTIONS} />
      </div>

      {/* Main content */}
      <div className="container py-8 space-y-10">
        {/* ─── Section: Business Overview ─── */}
        <section id="overview" className="scroll-mt-20">
          <h2 className="ct-section-title mb-6">Business Overview</h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumMetricCard
                title="RFQs"
                value={stats?.rfqCount ?? 0}
                icon={<ClipboardList className="h-5 w-5" />}
                sparkData={SPARK_RFQS}
                trend={{ value: 12, label: "vs last month" }}
                subMetrics={[
                  { label: "Active", value: stats?.openRfqs ?? 0 },
                  { label: "Expiring Soon", value: stats?.expiringRfqs ?? 0 },
                  { label: "Response Rate", value: `${stats?.responseRate ?? 0}%` },
                ]}
                delay={0}
              />
              <PremiumMetricCard
                title="Quotes"
                value={stats?.quotesReceived ?? 0}
                icon={<FileText className="h-5 w-5" />}
                sparkData={SPARK_QUOTES}
                accentColor="#3B82F6"
                subMetrics={[
                  { label: "Awaiting Action", value: stats?.activeQuotes ?? 0 },
                  { label: "Accepted", value: stats?.acceptedQuotes ?? 0 },
                  { label: "Avg Price Diff", value: `${stats?.avgPriceDiff ?? 0}%` },
                ]}
                delay={100}
              />
              <PremiumMetricCard
                title="Orders"
                value={(stats?.ordersRunning ?? 0) + (stats?.ordersCompleted ?? 0)}
                icon={<Package className="h-5 w-5" />}
                sparkData={SPARK_ORDERS}
                accentColor="#16A34A"
                subMetrics={[
                  { label: "Running", value: stats?.ordersRunning ?? 0 },
                  { label: "Completed", value: stats?.ordersCompleted ?? 0 },
                  { label: "Spend", value: stats?.spendThisMonth ? `₹${(stats.spendThisMonth / 1000).toFixed(0)}K` : "₹0" },
                ]}
                delay={200}
              />
              <PremiumMetricCard
                title="Supplier Network"
                value={stats?.savedSuppliers ?? 0}
                icon={<Users className="h-5 w-5" />}
                sparkData={SPARK_SUPPLIERS}
                accentColor="#7C3AED"
                subMetrics={[
                  { label: "Verified", value: stats?.verifiedSuppliers ?? 0 },
                  { label: "New Matches", value: stats?.newMatches ?? 0 },
                ]}
                delay={300}
              />
            </div>
          )}
        </section>

        {/* ─── Section: AI Insights ─── */}
        <section id="insights" className="scroll-mt-20">
          <AIProcurementInsights />
        </section>

        {/* ─── Section: Active RFQs ─── */}
        <section id="rfqs" className="scroll-mt-20">
          <div className="ct-card p-6">
            <h2 className="ct-section-title mb-1">Active RFQs</h2>
            <p className="mb-6 text-sm text-slate-400">
              Track your requirements and incoming supplier quotes
            </p>
            <ActiveRfqTable />
          </div>
        </section>

        {/* ─── Section: Quote Comparison ─── */}
        <section id="quotes" className="scroll-mt-20">
          <div className="ct-card p-6">
            <h2 className="ct-section-title mb-1">Quote Comparison Workspace</h2>
            <p className="mb-6 text-sm text-slate-400">
              Compare supplier quotes side by side
            </p>
            <QuoteComparisonWorkspace />
          </div>
        </section>

        {/* ─── Section: Saved Suppliers ─── */}
        <section id="suppliers" className="scroll-mt-20">
          <h2 className="ct-section-title mb-6">Saved Suppliers</h2>
          <SavedSuppliersGrid />
        </section>

        {/* ─── Section: Market Intelligence ─── */}
        <section id="market" className="scroll-mt-20">
          <MarketIntelligence role="buyer" />
        </section>

        {/* ─── Section: Calendar ─── */}
        <section id="calendar" className="scroll-mt-20">
          <CalendarWidget />
        </section>

        {/* ─── Section: Messages ─── */}
        <section id="messages" className="scroll-mt-20">
          <div className="ct-card p-6">
            <h2 className="ct-section-title mb-1">Messages</h2>
            <p className="mb-6 text-sm text-slate-400">
              Conversations with suppliers
            </p>
            <MessageInbox />
          </div>
        </section>

        {/* ─── Section: Notifications ─── */}
        <section id="notifications" className="scroll-mt-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="ct-card p-6">
              <h2 className="ct-section-title mb-6">Notifications</h2>
              <GroupedNotifications />
            </div>
            <div>
              <ProfileCompletionWidget
                role="buyer"
                percent={stats?.profileCompletion ?? 0}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
