"use client";

import { QuoteComparisonWorkspace } from "@/components/dashboard/v2/QuoteComparisonWorkspace";

export default function BuyerQuotesContent() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="ct-section-title text-3xl">Quote Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">
          Compare supplier quotes, negotiate, and award contracts
        </p>
      </div>

      <div className="ct-card p-6">
        <QuoteComparisonWorkspace />
      </div>
    </div>
  );
}
