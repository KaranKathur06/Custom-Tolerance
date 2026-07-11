"use client";

import React, { useState } from "react";
import { Phase1Data } from "./Phase1Technical";
import { Phase2Data } from "./Phase2Commercial";
import { Phase3Data } from "./Phase3Packaging";
import { CheckCircle2, AlertCircle, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { UploadedImage } from "./FormComponents";

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

  // Validation logic
  const missingFields: string[] = [];
  
  if (!data.productName) missingFields.push("Product Name (Phase 1)");
  if (!data.images || data.images.length === 0) missingFields.push("Images (Phase 1)");
  if (!data.priceType) missingFields.push("Pricing Model (Phase 1)");
  if (data.priceType !== "ask_for_price") {
    if (!data.currency) missingFields.push("Currency (Phase 1)");
    if (!data.priceUnit) missingFields.push("Price Unit (Phase 1)");
    if (!data.minPrice) missingFields.push("Price Amount (Phase 1)");
  }
  if (!data.capabilities || data.capabilities.length === 0) missingFields.push("Capabilities (Phase 1)");
  if (!data.industries || data.industries.length === 0) missingFields.push("Industries (Phase 1)");
  if (!data.materials || data.materials.length === 0) missingFields.push("Materials (Phase 1)");
  if (!data.tolerance) missingFields.push("Tolerance (Phase 1)");
  if (!data.qualityCertificate) missingFields.push("Quality Certificate (Phase 1)");
  if (!data.brandMarking) missingFields.push("Brand Marking (Phase 1)");
  if (!data.diesAndTools) missingFields.push("Dies & Tooling (Phase 1)");

  if (!data.description) missingFields.push("Description (Phase 2)");
  if (!data.moq) missingFields.push("MOQ (Phase 2)");
  if (!data.leadTime) missingFields.push("Lead Time (Phase 2)");
  if (!data.productionCapacity) missingFields.push("Production Capacity (Phase 2)");
  if (!data.countryOfOrigin) missingFields.push("Country of Origin (Phase 2)");
  if (!data.thirdPartyInspection) missingFields.push("Third Party Inspection (Phase 2)");
  if (!data.freeSample) missingFields.push("Free Sample (Phase 2)");
  if (!data.paymentTerms || data.paymentTerms.length === 0) missingFields.push("Payment Terms (Phase 2)");
  if (!data.incoterms || data.incoterms.length === 0) missingFields.push("Incoterms (Phase 2)");

  if (!data.shippingType) missingFields.push("Shipping Type (Phase 3)");
  if (data.shippingType === "packed") {
    if (!data.primaryPackaging) missingFields.push("Primary Packaging (Phase 3)");
    if (!data.secondaryPackaging) missingFields.push("Secondary Packaging (Phase 3)");
  }

  const isReady = missingFields.length === 0;

  const handlePublish = async () => {
    if (!draftId) return;
    setIsPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/seller/products/${draftId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish product");
      }
      
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
          <div className="flex flex-col gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              Missing Required Fields
            </div>
            <p className="text-sm">Please complete the following fields before publishing:</p>
            <ul className="list-disc pl-8 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {missingFields.map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Summary Card */}
          <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="bg-white p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-lg">Product Preview</h3>
            </div>
            <div className="p-4 space-y-6">
              
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300">
                  {data.images && data.images.length > 0 && data.images.find(i => i.isPrimary) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={data.images.find(i => i.isPrimary)?.url} alt="Primary" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xl font-bold text-slate-900">{data.productName || "Untitled Product"}</h4>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Price:</span>{" "}
                    {data.priceType === "ask_for_price" ? "Ask for Price (RFQ)" : 
                     data.priceType === "fixed_price" ? `${data.currency} ${data.minPrice} / ${data.priceUnit}` :
                     data.priceType === "price_range" ? `${data.currency} ${data.minPrice} - ${data.maxPrice} / ${data.priceUnit}` : "—"}
                  </div>
                  <div className="text-sm text-slate-600 line-clamp-3 mt-2">
                    {data.description || "No description provided."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <span className="block text-slate-500 mb-1 text-xs uppercase tracking-wider font-semibold">Materials</span>
                  <span className="font-medium text-slate-900">{data.materials?.join(", ") || "—"}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 text-xs uppercase tracking-wider font-semibold">Tolerance</span>
                  <span className="font-medium text-slate-900">{data.tolerance ? data.tolerance.replace(/_/g, ' ') : "—"}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 text-xs uppercase tracking-wider font-semibold">MOQ</span>
                  <span className="font-medium text-slate-900">{data.moq ? `${data.moq} ${data.productionCapacityUnit}` : "—"}</span>
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 text-xs uppercase tracking-wider font-semibold">Lead Time</span>
                  <span className="font-medium text-slate-900">{data.leadTime ? data.leadTime.replace(/_/g, ' ') : "—"}</span>
                </div>
              </div>

              <div className="text-sm bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <span className="block text-slate-500 mb-2 text-xs uppercase tracking-wider font-semibold">Capabilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.capabilities?.length ? data.capabilities.map(cap => (
                     <span key={cap} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">{cap.replace(/_/g, ' ')}</span>
                  )) : <span className="text-slate-400">None selected</span>}
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden h-fit sticky top-6 shadow-sm">
            <div className="p-6 text-center border-b border-slate-100">
              <Rocket className="mx-auto mb-4 h-12 w-12 text-blue-500" />
              <h3 className="mb-2 font-bold text-slate-900 text-lg">Ready to go live?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Publishing this product will synchronize it across the marketplace, RFQ engine, and your supplier profile.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              
              <button
                onClick={handlePublish}
                disabled={!isReady || isPublishing || !draftId}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPublishing ? (
                  "Publishing..."
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Publish Product
                  </>
                )}
              </button>

              <div className="text-center text-xs text-slate-500 mt-2">
                All changes are automatically saved as a draft. You can safely leave this page and return later.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
