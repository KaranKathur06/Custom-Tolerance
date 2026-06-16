"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Building2,
  MapPin,
  Globe2,
  Mail,
  Calendar,
  ShieldCheck,
  Users,
  ClipboardList,
  Package,
  Heart,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ActivityTimeline } from "@/components/dashboard/v2/ActivityTimeline";
import { AchievementBadges } from "@/components/dashboard/v2/AchievementBadges";
import { TrustScoreRing } from "@/components/dashboard/v2/TrustScoreRing";
import { Button } from "@/components/ui/button";

type ProfileData = {
  role: "buyer" | "seller" | "both" | "admin";
  name: string;
  email: string;
  companyName?: string;
  gst?: string;
  industry?: string;
  website?: string;
  location?: string;
  established?: string;
  phone?: string;
  // Buyer-specific
  interestedCategories?: string[];
  moqPreference?: string;
  preferredLeadTime?: string;
  exportRequired?: boolean;
  paymentTerms?: string;
  // Stats
  rfqsPosted?: number;
  ordersCompleted?: number;
  suppliersConnected?: number;
  totalSpend?: number;
  listingsTotal?: number;
  revenue?: number;
  trustScore?: number;
  profileCompletion?: number;
};

export default function ProfilePageContent() {
  const params = useParams();
  const slug = params.slug as string;
  const { profile, sellerProfile, company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeView, setActiveView] = useState<"buyer" | "seller" | "unified">("unified");

  useEffect(() => {
    // Build profile from auth context
    if (profile) {
      const role: ProfileData["role"] = sellerProfile ? (profile ? "both" : "seller") : "buyer";

      setProfileData({
        role,
        name: profile.full_name || "User",
        email: profile.email || "",
        companyName: company?.name || "",
        location: undefined,
        industry: undefined,
        trustScore: sellerProfile?.trust_level ? sellerProfile.trust_level * 20 : 60,
        profileCompletion: 72,
        rfqsPosted: 0,
        ordersCompleted: 0,
        suppliersConnected: 0,
        totalSpend: 0,
        listingsTotal: 0,
      });
    }
    setLoading(false);
  }, [profile, sellerProfile, company]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg font-medium text-slate-500">Profile not found</p>
        <Link href="/login" className="ct-btn-primary mt-4 inline-flex text-sm">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--ct-bg))]">
      {/* Hero Header */}
      <div className="ct-hero-gradient relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ct-gold/8 blur-3xl" />
        <div className="container relative z-10 pb-20 pt-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white/20 bg-white/10 text-3xl font-bold text-white backdrop-blur">
                {profileData.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-outfit text-3xl font-bold text-white">
                  {profileData.name}
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {profileData.companyName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileData.role === "both" || profileData.role === "buyer" ? (
                    <span className="ct-badge-gold text-[10px]">Buyer</span>
                  ) : null}
                  {profileData.role === "both" || profileData.role === "seller" ? (
                    <span className="ct-badge-verified text-[10px]">Seller</span>
                  ) : null}
                  {profileData.role === "admin" && (
                    <span className="ct-badge-export text-[10px]">Admin</span>
                  )}
                </div>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Switcher for dual-role users */}
      {profileData.role === "both" && (
        <div className="container -mt-6">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["unified", "buyer", "seller"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                  activeView === view
                    ? "bg-ct-navy text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)} View
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Company Details */}
            <div className="ct-card p-6">
              <h2 className="ct-section-title mb-5">Company Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={<Building2 />} label="Company" value={profileData.companyName} />
                <InfoRow icon={<Mail />} label="Email" value={profileData.email} />
                {profileData.location && (
                  <InfoRow icon={<MapPin />} label="Location" value={profileData.location} />
                )}
                {profileData.industry && (
                  <InfoRow icon={<Globe2 />} label="Industry" value={profileData.industry} />
                )}
                {profileData.gst && (
                  <InfoRow icon={<ShieldCheck />} label="GST" value={profileData.gst} />
                )}
                {profileData.established && (
                  <InfoRow icon={<Calendar />} label="Established" value={profileData.established} />
                )}
              </div>
            </div>

            {/* Activity Stats */}
            {(activeView === "unified" || activeView === "buyer") && (
              <div className="ct-card p-6">
                <h2 className="ct-section-title mb-5">
                  {activeView === "unified" ? "Activity Overview" : "Procurement Stats"}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatBlock
                    icon={<ClipboardList className="h-4 w-4 text-blue-500" />}
                    label="RFQs Posted"
                    value={profileData.rfqsPosted ?? 0}
                  />
                  <StatBlock
                    icon={<Package className="h-4 w-4 text-emerald-500" />}
                    label="Orders"
                    value={profileData.ordersCompleted ?? 0}
                  />
                  <StatBlock
                    icon={<Heart className="h-4 w-4 text-rose-500" />}
                    label="Suppliers"
                    value={profileData.suppliersConnected ?? 0}
                  />
                  <StatBlock
                    icon={<BarChart3 className="h-4 w-4 text-ct-gold" />}
                    label="Total Spend"
                    value={profileData.totalSpend ? `₹${(profileData.totalSpend / 1000).toFixed(0)}K` : "₹0"}
                  />
                </div>
              </div>
            )}

            {(activeView === "unified" || activeView === "seller") && profileData.role !== "buyer" && (
              <div className="ct-card p-6">
                <h2 className="ct-section-title mb-5">Selling Stats</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatBlock
                    icon={<Package className="h-4 w-4 text-violet-500" />}
                    label="Listings"
                    value={profileData.listingsTotal ?? 0}
                  />
                  <StatBlock
                    icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
                    label="Revenue"
                    value={profileData.revenue ? `₹${(profileData.revenue / 100000).toFixed(1)}L` : "₹0"}
                  />
                  <StatBlock
                    icon={<Users className="h-4 w-4 text-blue-500" />}
                    label="Trust Score"
                    value={`${profileData.trustScore ?? 0}/100`}
                  />
                </div>
              </div>
            )}

            {/* Achievement Badges */}
            <div className="ct-card p-6">
              <h2 className="ct-section-title mb-5">Achievements</h2>
              <AchievementBadges />
            </div>

            {/* Activity Timeline */}
            <div className="ct-card p-6">
              <h2 className="ct-section-title mb-5">Recent Activity</h2>
              <ActivityTimeline />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            {/* Trust Score Ring */}
            <div className="ct-card flex flex-col items-center p-6">
              <TrustScoreRing
                score={profileData.trustScore ?? 60}
                size={140}
                strokeWidth={10}
              />
              <p className="mt-4 text-sm font-bold text-ct-navy">
                {(profileData.trustScore ?? 0) >= 80
                  ? "Excellent Standing"
                  : (profileData.trustScore ?? 0) >= 50
                  ? "Good Standing"
                  : "Needs Improvement"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Complete your profile to improve your score
              </p>
            </div>

            {/* Profile Completion */}
            <div className="ct-card p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Profile Completion
              </h4>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-bold text-ct-navy">
                  {profileData.profileCompletion ?? 0}%
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${profileData.profileCompletion ?? 0}%`,
                    background: "linear-gradient(90deg, #C68A2D, #D4A853)",
                  }}
                />
              </div>
              <Link
                href={profileData.role === "buyer" ? "/onboarding/buyer" : "/onboarding/seller"}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
              >
                Complete Profile <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="ct-card p-5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Actions
              </h4>
              <div className="space-y-2">
                {profileData.role !== "seller" && (
                  <Link href="/rfq/new" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <ClipboardList className="h-4 w-4" />
                      Post New RFQ
                    </Button>
                  </Link>
                )}
                {profileData.role !== "buyer" && (
                  <Link href="/dashboard/seller/create" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                      <Package className="h-4 w-4" />
                      Create Listing
                    </Button>
                  </Link>
                )}
                <Link href="/marketplace?type=suppliers" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Browse Suppliers
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ct-gold">{icon}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-ct-navy">{value}</p>
      </div>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="ct-stat-block flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-lg font-bold text-ct-navy">{value}</p>
      </div>
    </div>
  );
}
