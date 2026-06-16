"use client";

import { Eye, MousePointerClick, MessageSquare, FileText } from "lucide-react";
import { MiniSparkline } from "./MiniSparkline";

type ListingMetric = {
  id: string;
  title: string;
  views: number;
  clicks: number;
  inquiries: number;
  rfqsGenerated: number;
  viewsTrend: number[];
};

type ListingAnalyticsProps = {
  listings?: ListingMetric[];
  className?: string;
};

// Demo data when no real listings exist
const DEMO_LISTINGS: ListingMetric[] = [
  {
    id: "1",
    title: "CNC Machined Aluminium Parts",
    views: 342,
    clicks: 89,
    inquiries: 12,
    rfqsGenerated: 4,
    viewsTrend: [20, 35, 28, 42, 38, 55, 62],
  },
  {
    id: "2",
    title: "Precision Die Cast Components",
    views: 218,
    clicks: 56,
    inquiries: 8,
    rfqsGenerated: 2,
    viewsTrend: [15, 22, 18, 30, 25, 32, 28],
  },
  {
    id: "3",
    title: "SS304 Sheet Metal Fabrication",
    views: 156,
    clicks: 34,
    inquiries: 5,
    rfqsGenerated: 1,
    viewsTrend: [10, 12, 8, 18, 22, 16, 20],
  },
];

export function ListingAnalytics({
  listings = DEMO_LISTINGS,
  className = "",
}: ListingAnalyticsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {listings.map((listing, i) => (
        <div
          key={listing.id}
          className="ct-card p-5 opacity-0 animate-ct-fade-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start justify-between gap-4">
            <h4 className="text-sm font-bold text-ct-navy">{listing.title}</h4>
            <MiniSparkline
              data={listing.viewsTrend}
              width={80}
              height={32}
              color="#3B82F6"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricPill
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Views"
              value={listing.views}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <MetricPill
              icon={<MousePointerClick className="h-3.5 w-3.5" />}
              label="Clicks"
              value={listing.clicks}
              color="text-violet-600"
              bg="bg-violet-50"
            />
            <MetricPill
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              label="Inquiries"
              value={listing.inquiries}
              color="text-ct-gold"
              bg="bg-ct-gold/10"
            />
            <MetricPill
              icon={<FileText className="h-3.5 w-3.5" />}
              label="RFQs"
              value={listing.rfqsGenerated}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl ${bg} px-3 py-2`}>
      <span className={color}>{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
