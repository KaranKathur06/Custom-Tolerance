"use client";

import { ListingAnalytics } from "@/components/dashboard/v2/ListingAnalytics";
import { PerformanceMetrics } from "@/components/dashboard/v2/PerformanceMetrics";

export default function SellerAnalyticsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="ct-section-title text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Business performance, win rates, and listing insights
        </p>
      </div>

      <PerformanceMetrics />
      <ListingAnalytics />
    </div>
  );
}
