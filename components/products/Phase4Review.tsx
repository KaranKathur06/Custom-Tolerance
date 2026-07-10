"use client";

import React, { useState } from "react";
import { Phase1Data } from "./Phase1Technical";
import { Phase2Data } from "./Phase2Commercial";
import { Phase3Data } from "./Phase3Packaging";
import { CheckCircle2, AlertCircle, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";

type AllData = Partial<Phase1Data> & Partial<Phase2Data> & Partial<Phase3Data>;

export function Phase4Review({
  data,
  draftId,
}: {
  data: AllData;
  draftId: string | null;
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = !!(data.productName && data.priceType && data.leadTime && data.moq);

  const handlePublish = async () => {
    if (!draftId) return;
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/seller/products/${draftId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish product");
      
      // Redirect back to products dashboard
      router.push("/dashboard/seller/products");
    } catch (err: any) {
      setError(err.message || "An error occurred while publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Review & Publish</h2>
        
        {!isReady && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              You are missing required fields. Please ensure Phase 1 and Phase 2 are complete before publishing.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary Card */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-4 font-semibold text-slate-900">Summary</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Product Name</dt>
                <dd className="font-medium text-slate-900">{data.productName || "—"}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Pricing Model</dt>
                <dd className="font-medium text-slate-900 capitalize">{data.priceType || "—"}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">MOQ</dt>
                <dd className="font-medium text-slate-900">{data.moq || "—"}</dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-slate-500">Lead Time</dt>
                <dd className="font-medium text-slate-900">{data.leadTime || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
            <Rocket className="mb-4 h-10 w-10 text-blue-500" />
            <h3 className="mb-2 font-bold text-slate-900">Ready to go live?</h3>
            <p className="mb-6 text-sm text-slate-500">
              Publishing this product will submit it to our admins for review before it appears on the marketplace.
            </p>
            
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            
            <button
              onClick={handlePublish}
              disabled={!isReady || isPublishing || !draftId}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPublishing ? (
                "Publishing..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Publish Product
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
