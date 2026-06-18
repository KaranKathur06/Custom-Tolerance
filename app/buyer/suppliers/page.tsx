"use client";

import { SavedSuppliersGrid } from "@/components/dashboard/v2/SavedSuppliersGrid";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BuyerSuppliersPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="ct-section-title text-3xl">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Discover, save, and manage your supplier network
          </p>
        </div>
        <Link href="/marketplace?type=suppliers">
          <Button variant="outline" className="gap-1.5">
            <Search className="h-4 w-4" />
            Browse Directory
          </Button>
        </Link>
      </div>

      {/* Filter bar placeholder */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["Country", "Industry", "Material", "Certification", "MOQ", "Lead Time"].map(
          (filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300"
            >
              {filter}
            </button>
          ),
        )}
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-ct-navy">Saved Suppliers</h2>
        <SavedSuppliersGrid />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-ct-navy">Recommended Suppliers</h2>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500">
            Recommendations based on your RFQs, industry, and location will appear here.
          </p>
          <Link href="/marketplace?type=suppliers" className="mt-4 inline-block">
            <Button size="sm">Explore Suppliers</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
