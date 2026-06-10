"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, FileText, Quote, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsData = {
  rfqsPosted: number;
  rfqsThisMonth: number;
  quotesSent: number;
  quotesAccepted: number;
  responseRate: number;
  conversionRate: number;
  activeSuppliers: number;
  gstVerifiedSuppliers: number;
  gstVerifiedRate: number;
  activeBuyers: number;
  reviewsPublished: number;
  revenueNote: string;
  eventCounts: Record<string, number>;
};

export function AdminAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/analytics", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed to load analytics");
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  if (!data) return null;

  const kpis = [
    { label: "RFQs posted", value: data.rfqsPosted, sub: `${data.rfqsThisMonth} this month`, icon: FileText },
    { label: "Quotes sent", value: data.quotesSent, sub: `${data.responseRate}% response rate`, icon: Quote },
    { label: "Conversion rate", value: `${data.conversionRate}%`, sub: `${data.quotesAccepted} accepted`, icon: TrendingUp },
    { label: "Active suppliers", value: data.activeSuppliers, sub: `${data.gstVerifiedRate}% GST verified`, icon: ShieldCheck },
    { label: "Active buyers", value: data.activeBuyers, sub: `${data.reviewsPublished} reviews`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform events (this month)</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.eventCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform events recorded yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.eventCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span className="text-slate-600">{type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{data.revenueNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
