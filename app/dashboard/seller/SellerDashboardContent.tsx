"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Edit,
  Eye,
  Package,
  Inbox,
  MessageSquare,
  Sparkles,
  Users,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSupplierOnboardingStatus } from "@/lib/hooks/useSupplierOnboardingStatus";
import { ProfileCompletionBanner } from "@/components/supplier/ProfileCompletionBanner";
import { SupplierVerificationBadges } from "@/components/supplier/SupplierVerificationBadges";
import { MarketplaceFeatureLock } from "@/components/supplier/MarketplaceFeatureLock";
import { SellerHeroHeader } from "@/components/dashboard/v2/SellerHeroHeader";
import { PremiumMetricCard } from "@/components/dashboard/v2/PremiumMetricCard";
import { QuoteFunnel } from "@/components/dashboard/v2/QuoteFunnel";
import { PremiumLeadFeed } from "@/components/dashboard/v2/PremiumLeadFeed";
import { ListingAnalytics } from "@/components/dashboard/v2/ListingAnalytics";
import { TrustCenter } from "@/components/dashboard/v2/TrustCenter";
import { GroupedNotifications } from "@/components/dashboard/v2/GroupedNotifications";
import { DashboardSectionNav } from "@/components/dashboard/v2/DashboardSectionNav";
import { MessageInbox } from "@/components/marketplace/MessageInbox";
import { MarketIntelligence } from "@/components/dashboard/v2/MarketIntelligence";
import { CalendarWidget } from "@/components/dashboard/v2/CalendarWidget";
import { SubscriptionCenter } from "@/components/dashboard/SubscriptionCenter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const SECTIONS = [
  { id: "metrics", label: "Metrics" },
  { id: "leads", label: "Lead Feed" },
  { id: "listings", label: "My Listings" },
  { id: "analytics", label: "Analytics" },
  { id: "trust", label: "Trust Center" },
  { id: "market", label: "Market" },
  { id: "calendar", label: "Calendar" },
  { id: "messages", label: "Messages" },
  { id: "notifications", label: "Notifications" },
];

const SPARK_LISTINGS = [8, 10, 9, 14, 12, 16, 18];
const SPARK_INQUIRIES = [5, 8, 6, 12, 10, 15, 14];

export default function SellerDashboardContent() {
  const searchParams = useSearchParams();
  const { supabase, sellerProfile, profile, company } = useAuth();
  const { data: onboardingStatus } = useSupplierOnboardingStatus();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");

  const marketplaceLocked = onboardingStatus ? !onboardingStatus.marketplaceUnlocked : false;
  const userName = profile?.full_name?.split(" ")[0] || company?.name?.split(" ")[0] || "Seller";

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

  // Pipeline value estimate
  const pipelineValue =
    ((stats?.quotes.submitted ?? 0) + (stats?.quotes.viewed ?? 0)) * 50000;

  // Quote funnel stages from real data
  const funnelStages = stats
    ? [
        { label: "Sent", count: stats.quotes.submitted + stats.quotes.viewed + stats.quotes.shortlisted + stats.quotes.won, color: "#3B82F6" },
        { label: "Viewed", count: stats.quotes.viewed + stats.quotes.shortlisted + stats.quotes.won, color: "#8B5CF6" },
        { label: "Shortlisted", count: stats.quotes.shortlisted + stats.quotes.won, color: "#C68A2D" },
        { label: "Won", count: stats.quotes.won, color: "#16A34A" },
      ]
    : undefined;

  // Scroll to section from URL
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
      {/* Onboarding banner */}
      {onboardingStatus && (
        <div className="container pt-6">
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
        </div>
      )}

      {/* Hero */}
      <div className="container pt-6 pb-2">
        <SellerHeroHeader
          userName={userName}
          leads={stats?.leadFeedCount ?? 0}
          activeQuotes={(stats?.quotes.submitted ?? 0) + (stats?.quotes.viewed ?? 0)}
          pendingListings={stats?.listings.pending ?? 0}
          pipelineValue={pipelineValue}
          healthStatus={
            (stats?.profileHealth ?? 0) >= 80
              ? "excellent"
              : (stats?.profileHealth ?? 0) >= 50
              ? "good"
              : "needs-attention"
          }
        />
      </div>

      {/* Sticky Nav */}
      <div className="mt-6">
        <DashboardSectionNav sections={SECTIONS} />
      </div>

      {/* Main Content */}
      <div className="container py-8 space-y-10">
        {/* ─── Section: Metrics ─── */}
        <section id="metrics" className="scroll-mt-20">
          <h2 className="ct-section-title mb-6">Business Metrics</h2>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <PremiumMetricCard
                title="Listings"
                value={stats?.listings.total ?? 0}
                icon={<Package className="h-5 w-5" />}
                sparkData={SPARK_LISTINGS}
                subMetrics={[
                  { label: "Active", value: stats?.listings.active ?? 0 },
                  { label: "Paused", value: stats?.listings.paused ?? 0 },
                  { label: "Pending", value: stats?.listings.pending ?? 0 },
                  { label: "Views", value: stats?.listings.totalViews ?? 0 },
                ]}
                delay={0}
              />
              <PremiumMetricCard
                title="Inquiries"
                value={stats?.inquiries.total ?? 0}
                icon={<Inbox className="h-5 w-5" />}
                sparkData={SPARK_INQUIRIES}
                accentColor="#3B82F6"
                trend={{
                  value: stats?.inquiries.unread ?? 0,
                  label: "unread",
                }}
                subMetrics={[
                  { label: "Unread", value: stats?.inquiries.unread ?? 0 },
                  { label: "Responded", value: (stats?.inquiries.total ?? 0) - (stats?.inquiries.unread ?? 0) },
                ]}
                delay={100}
              />

              {/* Quote Pipeline — funnel inside metric */}
              <div className="ct-metric-card opacity-0 animate-ct-fade-up sm:col-span-2 lg:col-span-1" style={{ animationDelay: "200ms" }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quote Pipeline
                </p>
                <div className="mt-3">
                  <QuoteFunnel stages={funnelStages} />
                </div>
              </div>

              <PremiumMetricCard
                title="Revenue"
                value={stats?.quotes.won ?? 0}
                suffix=" orders"
                icon={<BarChart3 className="h-5 w-5" />}
                accentColor="#16A34A"
                subMetrics={[
                  { label: "Won", value: stats?.quotes.won ?? 0 },
                  { label: "Lost", value: stats?.quotes.lost ?? 0 },
                  {
                    label: "Win Rate",
                    value: ((stats?.quotes.won ?? 0) + (stats?.quotes.lost ?? 0)) > 0
                      ? `${(((stats?.quotes.won ?? 0) / ((stats?.quotes.won ?? 0) + (stats?.quotes.lost ?? 0))) * 100).toFixed(0)}%`
                      : "—",
                  },
                ]}
                delay={300}
              />
            </div>
          )}
        </section>

        {/* ─── Section: Lead Feed ─── */}
        <section id="leads" className="scroll-mt-20">
          <div className="ct-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="ct-section-title">Recommended RFQs</h2>
                <p className="mt-1 text-sm text-slate-400">
                  RFQs matched to your capabilities and location
                </p>
              </div>
              <Link href="/seller/rfqs">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Browse All
                </Button>
              </Link>
            </div>
            <PremiumLeadFeed />
          </div>
        </section>

        {/* ─── Section: My Listings ─── */}
        <section id="listings" className="scroll-mt-20">
          <div className="ct-card p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="ct-section-title">My Listings</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Manage your product and service listings
                </p>
              </div>
              <MarketplaceFeatureLock
                locked={marketplaceLocked}
                message={onboardingStatus?.marketplaceGate.message}
                missingRequirements={onboardingStatus?.marketplaceGate.missingRequirements}
              >
                <Link href="/dashboard/seller/create">
                  <Button
                    disabled={marketplaceLocked}
                    className="gap-1.5 bg-ct-navy text-white hover:bg-ct-navy-light"
                  >
                    <Plus className="h-4 w-4" />
                    Create Listing
                  </Button>
                </Link>
              </MarketplaceFeatureLock>
            </div>

            {/* Filter pills */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "draft", "pending", "active", "paused", "rejected"] as ListingFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setListingFilter(f)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      listingFilter === f
                        ? "bg-ct-navy text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== "all" && stats?.listings
                      ? ` (${stats.listings[f as keyof typeof stats.listings] ?? 0})`
                      : ""}
                  </button>
                ),
              )}
            </div>

            {/* Listings */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Package className="mb-3 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-500">No listings in this filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredListings.map((listing) => {
                  const status = listingBucket(listing);
                  return (
                    <div
                      key={listing.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <Link
                            href={`/products/${listing.slug}`}
                            className="font-semibold text-ct-navy hover:text-ct-gold transition-colors"
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
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                          {listing.price_min != null && (
                            <span>{formatCurrency(listing.price_min)}</span>
                          )}
                          <span>{listing.views_count ?? 0} views</span>
                          <span>{listing.inquiry_count ?? 0} inquiries</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/products/${listing.slug}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled
                          aria-label="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── Section: Analytics ─── */}
        <section id="analytics" className="scroll-mt-20">
          <h2 className="ct-section-title mb-6">Listing Analytics</h2>
          <ListingAnalytics />
        </section>

        {/* ─── Section: Trust Center ─── */}
        <section id="trust" className="scroll-mt-20">
          <TrustCenter
            score={stats?.profileHealth ?? onboardingStatus?.profileCompletionPercent ?? 65}
          />
        </section>

        {/* ─── Section: Market Intelligence ─── */}
        <section id="market" className="scroll-mt-20">
          <MarketIntelligence role="seller" />
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
              Procurement conversations with buyers
            </p>
            <MessageInbox />
          </div>
        </section>

        {/* ─── Section: Notifications + Subscription ─── */}
        <section id="notifications" className="scroll-mt-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="ct-card p-6">
              <h2 className="ct-section-title mb-6">Notifications</h2>
              <GroupedNotifications />
            </div>
            <SubscriptionCenter
              trustLevel={stats?.trustLevel ?? sellerProfile?.trust_level ?? 0}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
