"use client";

import Link from "next/link";
import { Building2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_BUYERS = [
  {
    name: "AutoParts India Ltd",
    industry: "Automotive",
    location: "Pune, Maharashtra",
    rfqsPosted: 12,
    avgOrderValue: "₹3.2L",
  },
  {
    name: "Precision Engineering Co",
    industry: "Aerospace",
    location: "Bangalore, Karnataka",
    rfqsPosted: 8,
    avgOrderValue: "₹5.8L",
  },
  {
    name: "MetalWorks Gujarat",
    industry: "Industrial Equipment",
    location: "Ahmedabad, Gujarat",
    rfqsPosted: 15,
    avgOrderValue: "₹2.1L",
  },
];

export default function SellerBuyerDirectoryPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ct-section-title text-3xl">Buyer Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discover active buyers and procurement opportunities
          </p>
        </div>
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search buyers..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-ct-navy focus:outline-none focus:ring-1 focus:ring-ct-navy"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_BUYERS.map((buyer) => (
          <div key={buyer.name} className="ct-card p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-ct-navy">{buyer.name}</h3>
            <p className="mt-1 text-xs text-slate-500">{buyer.industry}</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />
              {buyer.location}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">{buyer.rfqsPosted} RFQs posted</span>
              <span className="font-semibold text-slate-700">{buyer.avgOrderValue} avg</span>
            </div>
            <Link href="/seller/rfqs" className="mt-4 block">
              <Button size="sm" variant="outline" className="w-full">
                View RFQs
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
