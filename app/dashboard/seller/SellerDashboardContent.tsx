"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SellerTrustSection } from "@/components/dashboard/SellerTrustSection";
import { SellerQuotePipeline } from "@/components/dashboard/SellerQuotePipeline";
import { SellerLeadFeed } from "@/components/dashboard/SellerLeadFeed";
import { SellerInquiryInbox } from "@/components/dashboard/SellerInquiryInbox";
import { SubscriptionCenter } from "@/components/dashboard/SubscriptionCenter";
import { ProfileCompletionWidget } from "@/components/dashboard/ProfileCompletionWidget";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { MessageInbox } from "@/components/marketplace/MessageInbox";
import { ProfileCompletionBanner } from "@/components/supplier/ProfileCompletionBanner";
import { MarketplaceFeatureLock } from "@/components/supplier/MarketplaceFeatureLock";
import { SupplierVerificationBadges } from "@/components/supplier/SupplierVerificationBadges";
import { useSupplierOnboardingStatus } from "@/lib/hooks/useSupplierOnboardingStatus";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Plus,
  Edit,
  Eye,
  MessageSquare,
  Package,
  Users,
  Loader2,
  Inbox,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

type SellerListing = {
  id: string;
  title: string;
  slug: string;
  is_active: boolean | null;
  moderation_status: string | null;
  views_count: number | null;
  inquiry_count: number | null;
  price_min: number | null;
  created_at: string;
};

type SellerStats = {
  listings: {
    total: number;
    draft: number;
    pending: number;
    active: number;
    paused: number;
    rejected: number;
    totalViews: number;
    listingInquiries: number;
  };
  inquiries: { total: number; unread: number };
  quotes: { submitted: number; viewed: number; shortlisted: number; won: number; lost: number };
  leadFeedCount: number;
  profileHealth: number;
  trustLevel: number;
  unreadNotifications: number;
};

type ListingFilter = "all" | "draft" | "pending" | "active" | "paused" | "rejected";

function listingBucket(item: SellerListing): ListingFilter {
  const mod = item.moderation_status ?? "pending";
  if (mod === "rejected") return "rejected";
  if (mod === "pending" || mod === "in_review") return "pending";
  if (mod === "approved" && item.is_active) return "active";
  if (mod === "approved" && !item.is_active) return "paused";
  return "draft";
}

export default function SellerDashboardContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "listings";
  const { supabase, sellerProfile } = useAuth();
  const { data: onboardingStatus } = useSupplierOnboardingStatus();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");

  const marketplaceLocked = onboardingStatus ? !onboardingStatus.marketplaceUnlocked : false;

  useEffect(() => {
    if (!supabase || !sellerProfile?.id) {
      setLoading(false);
      return;
    }

    void (async () => {
      const [listingsRes, statsRes] = await Promise.all([
        supabase
          .from("listings")
          .select(
            "id, title, slug, is_active, moderation_status, views_count, inquiry_count, price_min, created_at",
          )
          .eq("seller_profile_id", sellerProfile.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
        fetch("/api/dashboard/seller/stats").then((r) => r.json()),
      ]);

      setListings(listingsRes.data ?? []);
      if (statsRes.success) setStats(statsRes.data);
      setLoading(false);
    })();
  }, [supabase, sellerProfile?.id]);

  const filteredListings = useMemo(() => {
    if (listingFilter === "all") return listings;
    return listings.filter((item) => listingBucket(item) === listingFilter);
  }, [listings, listingFilter]);

  const membershipLabel =
    (stats?.trustLevel ?? 0) >= 3 ? "gold" : (stats?.trustLevel ?? 0) >= 1 ? "silver" : "starter";

  return (
    <div className="container py-8">
      {onboardingStatus ? (
        <div className="mb-6 space-y-4">
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
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <SellerTrustSection hasListings={(stats?.listings.total ?? 0) > 0} />
        <ProfileCompletionWidget
          role="seller"
          percent={stats?.profileHealth ?? onboardingStatus?.profileCompletionPercent ?? 0}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/seller/rfqs">
          <Button variant="outline">Browse RFQs</Button>
        </Link>
        <Link href="/seller/quotes">
          <Button variant="outline">My Quotes</Button>
        </Link>
        <Link href="/onboarding/seller">
          <Button variant="outline">Improve Profile</Button>
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Seller Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Your operating center for leads, quotes, and listings
          </p>
        </div>
        <MarketplaceFeatureLock
          locked={marketplaceLocked}
          message={onboardingStatus?.marketplaceGate.message}
          missingRequirements={onboardingStatus?.marketplaceGate.missingRequirements}
        >
          <Link href="/dashboard/seller/create">
            <Button disabled={marketplaceLocked}>
              <Plus className="mr-2 h-4 w-4" />
              Create Listing
            </Button>
          </Link>
        </MarketplaceFeatureLock>
      </div>

      {loading ? (
        <div className="mb-8 flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Listings"
            value={stats?.listings.total ?? 0}
            sub={`${stats?.listings.active ?? 0} active`}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            title="Inquiries"
            value={stats?.inquiries.total ?? 0}
            sub={`${stats?.inquiries.unread ?? 0} unread`}
            icon={<Inbox className="h-4 w-4" />}
          />
          <StatCard
            title="Quote pipeline"
            value={(stats?.quotes.submitted ?? 0) + (stats?.quotes.viewed ?? 0)}
            sub={`${stats?.quotes.won ?? 0} won`}
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatCard title="Lead feed" value={stats?.leadFeedCount ?? 0} icon={<Sparkles className="h-4 w-4" />} />
          <StatCard title="Trust tier" value={membershipLabel} icon={<Users className="h-4 w-4" />} isLabel />
        </div>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="listings">My listings</TabsTrigger>
          <TabsTrigger value="inquiries">
            Inquiries
            {(stats?.inquiries.unread ?? 0) > 0 ? (
              <Badge className="ml-2" variant="destructive">
                {stats?.inquiries.unread}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="quotes">Quote pipeline</TabsTrigger>
          <TabsTrigger value="leads">Lead feed</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>My listings</CardTitle>
              <CardDescription>Filter by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["all", "draft", "pending", "active", "paused", "rejected"] as ListingFilter[]).map(
                  (f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={listingFilter === f ? "default" : "outline"}
                      onClick={() => setListingFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      {f !== "all" && stats?.listings
                        ? ` (${stats.listings[f as keyof typeof stats.listings] ?? 0})`
                        : ""}
                    </Button>
                  ),
                )}
              </div>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredListings.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No listings in this filter.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredListings.map((listing) => {
                    const status = listingBucket(listing);
                    return (
                      <div
                        key={listing.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Link
                              href={`/products/${listing.slug}`}
                              className="font-semibold hover:text-primary"
                            >
                              {listing.title}
                            </Link>
                            <Badge
                              variant={
                                status === "active"
                                  ? "success"
                                  : status === "pending"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {listing.price_min != null ? (
                              <span>{formatCurrency(listing.price_min)}</span>
                            ) : null}
                            <span>{listing.views_count ?? 0} views</span>
                            <span>{listing.inquiry_count ?? 0} inquiries</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/products/${listing.slug}`}>
                            <Button variant="outline" size="icon" aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="icon" disabled aria-label="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inquiries">
          <Card>
            <CardHeader>
              <CardTitle>Incoming inquiries</CardTitle>
              <CardDescription>Direct buyer messages from profile, listings, and search</CardDescription>
            </CardHeader>
            <CardContent>
              <SellerInquiryInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quote pipeline</CardTitle>
              <CardDescription>Submitted → Viewed → Shortlisted → Won / Lost</CardDescription>
            </CardHeader>
            <CardContent>
              <SellerQuotePipeline />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Lead feed</CardTitle>
              <CardDescription>RFQs matched to your capabilities and location</CardDescription>
            </CardHeader>
            <CardContent>
              <SellerLeadFeed />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Procurement conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <MessageInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionCenter trustLevel={stats?.trustLevel ?? sellerProfile?.trust_level ?? 0} />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
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
  isLabel,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  isLabel?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {isLabel ? (
          <Badge variant={value === "gold" ? "warning" : "secondary"}>
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
          </Badge>
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
