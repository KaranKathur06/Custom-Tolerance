"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Heart,
  Loader2,
  Package,
} from "lucide-react";
import { BuyerProcurementSection } from "@/components/dashboard/BuyerProcurementSection";
import { BuyerRfqList } from "@/components/dashboard/BuyerRfqList";
import { SavedSuppliersList } from "@/components/dashboard/SavedSuppliersList";
import { BuyerQuotesSection } from "@/components/dashboard/BuyerQuotesSection";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { ProfileCompletionWidget } from "@/components/dashboard/ProfileCompletionWidget";
import { MessageInbox } from "@/components/marketplace/MessageInbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BuyerStats = {
  rfqCount: number;
  openRfqs: number;
  closedRfqs: number;
  quotesReceived: number;
  activeQuotes: number;
  savedSuppliers: number;
  unreadNotifications: number;
  profileCompletion: number;
};

export default function BuyerDashboardContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "rfqs";
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/buyer/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Buyer Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Manage RFQs, compare quotes, and track suppliers
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/rfq/new">
            <Button>Post requirement</Button>
          </Link>
          <Link href="/marketplace?type=suppliers">
            <Button variant="outline">Find suppliers</Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <BuyerProcurementSection />
        <ProfileCompletionWidget role="buyer" percent={stats?.profileCompletion ?? 0} />
      </div>

      {loadingStats ? (
        <div className="mb-8 flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My RFQs"
            value={stats?.rfqCount ?? 0}
            sub={`${stats?.openRfqs ?? 0} open`}
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <StatCard
            title="Quotes received"
            value={stats?.quotesReceived ?? 0}
            sub={`${stats?.activeQuotes ?? 0} active`}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            title="Saved suppliers"
            value={stats?.savedSuppliers ?? 0}
            icon={<Heart className="h-4 w-4" />}
          />
          <StatCard
            title="Notifications"
            value={stats?.unreadNotifications ?? 0}
            sub="unread"
            icon={<Bell className="h-4 w-4" />}
          />
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="rfqs">My RFQs</TabsTrigger>
          <TabsTrigger value="quotes">Active quotes</TabsTrigger>
          <TabsTrigger value="saved">Saved suppliers</TabsTrigger>
          <TabsTrigger value="history">Order history</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="rfqs">
          <Card>
            <CardHeader>
              <CardTitle>My RFQs</CardTitle>
              <CardDescription>Open requirements receiving supplier quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <BuyerRfqList filter="open" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Active quotes</CardTitle>
              <CardDescription>Compare supplier quotes side by side</CardDescription>
            </CardHeader>
            <CardContent>
              <BuyerQuotesSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved suppliers</CardTitle>
              <CardDescription>Bookmarked suppliers for quick RFQs</CardDescription>
            </CardHeader>
            <CardContent>
              <SavedSuppliersList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Order history</CardTitle>
              <CardDescription>Closed RFQs and accepted quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <BuyerRfqList filter="closed" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Conversations with suppliers</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification center</CardTitle>
              <CardDescription>Quotes, RFQ updates, and reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationCenter />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
