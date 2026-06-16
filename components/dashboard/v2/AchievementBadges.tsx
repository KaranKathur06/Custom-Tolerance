"use client";

import {
  ShieldCheck,
  Zap,
  Truck,
  Globe2,
  Award,
  Heart,
  Star,
  Clock,
} from "lucide-react";

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  earnedDate?: string;
  howToEarn?: string;
  color: string;
};

type AchievementBadgesProps = {
  badges?: Badge[];
  className?: string;
};

const DEFAULT_BADGES: Badge[] = [
  {
    id: "verified",
    name: "Verified Supplier",
    description: "GST and business documents verified",
    icon: <ShieldCheck className="h-5 w-5" />,
    earned: true,
    earnedDate: "Jan 2025",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    id: "top-responder",
    name: "Top Responder",
    description: "Average response time under 2 hours",
    icon: <Zap className="h-5 w-5" />,
    earned: true,
    earnedDate: "Mar 2025",
    color: "from-amber-400 to-amber-500",
  },
  {
    id: "fast-delivery",
    name: "Fast Delivery",
    description: "95%+ orders delivered on time",
    icon: <Truck className="h-5 w-5" />,
    earned: false,
    howToEarn: "Deliver 10+ orders on time",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "export-ready",
    name: "Export Ready",
    description: "Certified for international exports",
    icon: <Globe2 className="h-5 w-5" />,
    earned: true,
    earnedDate: "Feb 2025",
    color: "from-indigo-500 to-violet-600",
  },
  {
    id: "iso-certified",
    name: "ISO Certified",
    description: "ISO 9001:2015 quality certification",
    icon: <Award className="h-5 w-5" />,
    earned: false,
    howToEarn: "Upload valid ISO certificate",
    color: "from-sky-500 to-cyan-600",
  },
  {
    id: "trusted-buyer",
    name: "Trusted Buyer",
    description: "10+ completed orders with positive feedback",
    icon: <Heart className="h-5 w-5" />,
    earned: false,
    howToEarn: "Complete 10 orders with 4+ star ratings",
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "premium-member",
    name: "Premium Member",
    description: "Active premium subscription member",
    icon: <Star className="h-5 w-5" />,
    earned: false,
    howToEarn: "Subscribe to Gold or Platinum plan",
    color: "from-ct-gold to-yellow-500",
  },
  {
    id: "early-adopter",
    name: "Early Adopter",
    description: "Joined CustomTolerance in the first year",
    icon: <Clock className="h-5 w-5" />,
    earned: true,
    earnedDate: "Dec 2024",
    color: "from-slate-600 to-slate-700",
  },
];

export function AchievementBadges({
  badges = DEFAULT_BADGES,
  className = "",
}: AchievementBadgesProps) {
  const earned = badges.filter((b) => b.earned);
  const unearned = badges.filter((b) => !b.earned);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Earned badges */}
      {earned.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Earned ({earned.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {earned.map((badge, i) => (
              <div
                key={badge.id}
                className="ct-card flex items-center gap-3 p-4 opacity-0 animate-ct-scale-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${badge.color} text-white shadow-sm`}
                >
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ct-navy">{badge.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {badge.description}
                  </p>
                  {badge.earnedDate && (
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-500">
                      Earned {badge.earnedDate}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unearned badges */}
      {unearned.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Available to Earn ({unearned.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {unearned.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 transition-colors hover:border-slate-300"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/60 text-slate-400">
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-400">{badge.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {badge.description}
                  </p>
                  {badge.howToEarn && (
                    <p className="mt-0.5 text-[10px] font-medium text-ct-gold">
                      How to earn: {badge.howToEarn}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
