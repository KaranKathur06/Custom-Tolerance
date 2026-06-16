"use client";

import Link from "next/link";
import {
  ShieldCheck,
  FileCheck,
  Camera,
  Award,
  AlertTriangle,
  ArrowRight,
  Upload,
} from "lucide-react";
import { TrustScoreRing } from "./TrustScoreRing";
import { Button } from "@/components/ui/button";

type TrustItem = {
  label: string;
  status: "verified" | "uploaded" | "missing" | "pending";
  points?: number;
  icon: React.ReactNode;
};

type TrustCenterProps = {
  score?: number;
  items?: TrustItem[];
  className?: string;
};

const DEFAULT_ITEMS: TrustItem[] = [
  { label: "GST Verified", status: "verified", points: 20, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "ISO 9001 Certificate", status: "uploaded", points: 15, icon: <FileCheck className="h-4 w-4" /> },
  { label: "Factory Photos", status: "uploaded", points: 10, icon: <Camera className="h-4 w-4" /> },
  { label: "IATF 16949 Certificate", status: "missing", points: 10, icon: <Award className="h-4 w-4" /> },
  { label: "AS9100 Certification", status: "missing", points: 10, icon: <Award className="h-4 w-4" /> },
  { label: "Company Description", status: "verified", points: 5, icon: <FileCheck className="h-4 w-4" /> },
];

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    className: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    icon: "✓",
  },
  uploaded: {
    label: "Uploaded",
    className: "bg-blue-50 text-blue-600 ring-blue-200",
    icon: "✓",
  },
  pending: {
    label: "Pending Review",
    className: "bg-amber-50 text-amber-600 ring-amber-200",
    icon: "⏳",
  },
  missing: {
    label: "Missing",
    className: "bg-red-50 text-red-500 ring-red-200",
    icon: "⚠",
  },
};

export function TrustCenter({
  score = 85,
  items = DEFAULT_ITEMS,
  className = "",
}: TrustCenterProps) {
  const missingItems = items.filter((i) => i.status === "missing");
  const potentialGain = missingItems.reduce((s, i) => s + (i.points ?? 0), 0);

  return (
    <div className={`ct-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <TrustScoreRing score={score} size={100} strokeWidth={7} />
          <div>
            <h3 className="font-outfit text-xl font-bold text-ct-navy">
              Trust Center
            </h3>
            <p className="mt-0.5 text-sm text-slate-400">
              Build trust with buyers by completing your verification
            </p>
            {potentialGain > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ct-gold">
                <AlertTriangle className="h-3 w-3" />
                Upload missing items → gain +{potentialGain} points
              </p>
            )}
          </div>
        </div>
        <Link href="/onboarding/seller">
          <Button className="gap-1.5 bg-ct-navy text-white hover:bg-ct-navy-light">
            <Upload className="h-3.5 w-3.5" />
            Upload Documents
          </Button>
        </Link>
      </div>

      {/* Trust items */}
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const config = STATUS_CONFIG[item.status];
          return (
            <div
              key={item.label}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.status === "missing"
                    ? "bg-red-50 text-red-400"
                    : item.status === "verified"
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-blue-50 text-blue-500"
                }`}
              >
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">
                  {item.label}
                </p>
                {item.points && (
                  <p className="text-[10px] text-slate-400">
                    +{item.points} trust points
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${config.className}`}
              >
                {config.icon} {config.label}
              </span>
              {item.status === "missing" && (
                <Link
                  href="/onboarding/seller"
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
                >
                  Upload
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
