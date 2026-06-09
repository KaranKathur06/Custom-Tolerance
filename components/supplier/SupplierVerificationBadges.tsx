"use client";

import { BadgeCheck, Building2, Factory, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SupplierVerificationBadge } from "@/lib/marketplace/supplier-trust-score";

const BADGE_ICONS: Record<string, typeof BadgeCheck> = {
  verified_supplier: BadgeCheck,
  gst_verified: Building2,
  phone_verified: Phone,
  email_verified: Mail,
  factory_verified: Factory,
};

type SupplierVerificationBadgesProps = {
  badges: SupplierVerificationBadge[];
  size?: "sm" | "md";
  showUnearned?: boolean;
};

export function SupplierVerificationBadges({
  badges,
  size = "sm",
  showUnearned = false,
}: SupplierVerificationBadgesProps) {
  const visible = showUnearned ? badges : badges.filter((b) => b.earned);

  if (!visible.length) return null;

  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((badge) => {
        const Icon = BADGE_ICONS[badge.key] ?? BadgeCheck;
        return (
          <Badge
            key={badge.key}
            variant={badge.earned ? "default" : "secondary"}
            className={`gap-1 ${textSize} ${badge.earned ? "bg-emerald-700 hover:bg-emerald-700" : "opacity-50"}`}
          >
            <Icon className={iconSize} />
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
}
