import {
  BadgeCheck,
  Calendar,
  Clock3,
  PackageCheck,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import type { GstVerificationSnapshot } from "@/lib/marketplace/supplier-profile-extended";

type SupplierTrustBlockProps = {
  reviewAvg: number;
  reviewCount: number;
  verifiedOrderCount: number;
  responseRate: number;
  avgQuoteTime: string | null;
  memberSince: string | null;
  gstVerifiedAt: string | null;
  gstLegalName: string | null;
  gstVerification: GstVerificationSnapshot | null;
  verificationStatus: string;
};

export function SupplierTrustBlock({
  reviewAvg,
  reviewCount,
  verifiedOrderCount,
  responseRate,
  avgQuoteTime,
  memberSince,
  gstVerifiedAt,
  gstLegalName,
  gstVerification,
  verificationStatus,
}: SupplierTrustBlockProps) {
  const isGstVerified =
    Boolean(gstVerifiedAt) &&
    (gstVerification?.status === "active" || verificationStatus === "verified");

  const memberLabel = memberSince
    ? new Date(memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        Trust & performance
      </h4>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <TrustMetric
          icon={<Star className="h-4 w-4 text-amber-500" />}
          label="Review score"
          value={reviewCount > 0 ? `${reviewAvg.toFixed(1)} / 5` : "New supplier"}
          sub={reviewCount > 0 ? `${reviewCount} reviews` : undefined}
        />
        <TrustMetric
          icon={<PackageCheck className="h-4 w-4 text-blue-500" />}
          label="Verified orders"
          value={verifiedOrderCount > 0 ? String(verifiedOrderCount) : "—"}
        />
        <TrustMetric
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Response rate"
          value={`${responseRate}%`}
        />
        <TrustMetric
          icon={<Clock3 className="h-4 w-4 text-indigo-500" />}
          label="Avg quote time"
          value={avgQuoteTime ?? "On request"}
        />
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {isGstVerified ? (
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <span className="font-semibold text-emerald-700">GST Verified</span>
              {gstLegalName ? (
                <p className="text-xs text-slate-600">{gstLegalName}</p>
              ) : null}
              {gstVerifiedAt ? (
                <p className="text-xs text-slate-500">
                  Verified {new Date(gstVerifiedAt).toLocaleDateString("en-IN")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {verificationStatus === "verified" ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            <span className="font-medium">Verified Supplier</span>
          </div>
        ) : null}

        {memberLabel ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Member since {memberLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrustMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
