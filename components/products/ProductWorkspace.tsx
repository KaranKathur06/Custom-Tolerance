"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { MasterDataProvider } from "./MasterDataProvider";
import { Phase1Technical, Phase1Data } from "./Phase1Technical";
import { Phase2Commercial, Phase2Data } from "./Phase2Commercial";
import { Phase3Packaging, Phase3Data } from "./Phase3Packaging";
import { Phase4Review } from "./Phase4Review";
import { CheckCircle2, Loader2, Save, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type ProductData = Partial<Phase1Data> & Partial<Phase2Data> & Partial<Phase3Data>;

function WorkspaceContent({ existingDraftId }: { existingDraftId?: string }) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(existingDraftId || null);
  const [draftError, setDraftError] = useState(false);
  const [draftErrorMessage, setDraftErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activePhase, setActivePhase] = useState<number>(1);
  
  // A ref to store the latest data so the background autosave can access it
  const dataRef = useRef<ProductData>({});
  
  // Track active phase to trigger render for Review tab only
  const [reviewTrigger, setReviewTrigger] = useState(0);

  // Background draft creation
  useEffect(() => {
    if (draftId || existingDraftId) return;

    let isMounted = true;
    
    async function createDraft() {
      try {
        const res = await fetch("/api/dashboard/seller/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: "Draft Product",
            isVisible: false,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          if (res.status === 422 && errData?.code === "SELLER_PROFILE_INCOMPLETE") {
            if (isMounted) {
              setDraftError(true);
              setDraftErrorMessage(errData.message || "Complete seller onboarding before creating products.");
            }
            return;
          }
          throw new Error("Failed to create draft");
        }
        
        const data = (await res.json()) as { product?: { id: string } };
        
        if (isMounted && data.product?.id) {
          setDraftId(data.product.id);
          // Update URL silently
          window.history.replaceState(null, "", `/dashboard/seller/products/${data.product.id}`);
          
          // Trigger a save of any data that was entered while draft was initializing
          if (Object.keys(dataRef.current).length > 0) {
            setTimeout(() => triggerAutosave(dataRef.current, data.product!.id), 100);
          }
        }
      } catch (err) {
        console.error("Draft creation failed", err);
        if (isMounted) setDraftError(true);
      }
    }

    void createDraft();

    return () => { isMounted = false; };
  }, [draftId, existingDraftId]);

  const triggerAutosave = useCallback(async (dataToSave: ProductData, targetDraftId?: string) => {
    const idToUse = targetDraftId || draftId;
    if (!idToUse) return;

    setIsSaving(true);
    setDraftError(false);
    try {
      // Complete mapping to backend schema
      // This bridges the rich frontend UI fields to the existing schema
      const payload: any = {};
      
      // Phase 1
      if (dataToSave.productName !== undefined) payload.productName = dataToSave.productName;
      
      // Handle pricing
      if (dataToSave.priceType !== undefined) {
         if (dataToSave.priceType === "ask_for_price") {
           payload.estimatedPrice = null;
         } else {
           payload.estimatedPrice = Number(dataToSave.minPrice) || null;
         }
      }
      
      // Combine properties for the current schema
      if (dataToSave.capabilities !== undefined) {
        // The old schema has a string 'capability' - we pick the first one for now
        payload.capability = dataToSave.capabilities.length > 0 ? dataToSave.capabilities[0] : null;
        payload.capabilities = dataToSave.capabilities; // if we update DB to use array
      }
      
      if (dataToSave.materials !== undefined) payload.materials = dataToSave.materials;
      if (dataToSave.tolerance !== undefined) payload.toleranceCapability = dataToSave.tolerance;
      if (dataToSave.images !== undefined) {
        // Send image URLs in a format the backend can store if a column exists
        // Currently we'll assume the backend handles it or we'll pass it in an unstructured field for now
        payload.images = dataToSave.images.map(img => img.url);
      }

      // Phase 2
      if (dataToSave.moq !== undefined) payload.moq = Number(dataToSave.moq) || null;
      if (dataToSave.productionCapacity !== undefined) payload.productionCapacity = Number(dataToSave.productionCapacity) || null;
      if (dataToSave.productionCapacityUnit !== undefined) payload.productionCapacityUnit = dataToSave.productionCapacityUnit;
      if (dataToSave.leadTime !== undefined) payload.leadTime = dataToSave.leadTime;
      if (dataToSave.freeSample !== undefined) payload.customTolerance = dataToSave.freeSample; // Re-using customTolerance string for sample (hack before DB update)
      
      // Convert arrays for legacy string[] cols
      if (dataToSave.paymentTerms !== undefined) payload.certifications = dataToSave.paymentTerms; 
      
      // Phase 3
      if (dataToSave.weightValue !== undefined) payload.quantityAvailable = Number(dataToSave.weightValue) || null;

      const res = await fetch(`/api/dashboard/seller/products?id=${idToUse}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Autosave failed");

      setLastSaved(new Date());
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setIsSaving(false);
    }
  }, [draftId]);

  const handleDataChange = useCallback((newData: ProductData) => {
    dataRef.current = { ...dataRef.current, ...newData };
    if (activePhase === 4) {
      setReviewTrigger(prev => prev + 1);
    }
    triggerAutosave(dataRef.current);
  }, [triggerAutosave, activePhase]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Creation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define your product specifications to match with buyer RFQs.
          </p>
          
          {draftError && (
            <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-md">
              <span className="font-semibold block mb-1">Onboarding Incomplete</span>
              {draftErrorMessage || "Unable to initialize draft in background. Your changes may not save."}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> <span className="text-blue-600">Saving...</span></>
            ) : draftError ? (
              <><AlertCircle className="h-4 w-4 text-amber-500" /> <span className="text-amber-600">Offline / Retrying...</span></>
            ) : lastSaved ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Saved {lastSaved.toLocaleTimeString()}</>
            ) : draftId ? (
              <><Save className="h-4 w-4" /> Ready</>
            ) : (
              <><Loader2 className="h-4 w-4 animate-spin" /> Initializing draft...</>
            )}
          </div>
          
          <button
            onClick={() => router.push("/dashboard/seller/products")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress / Phases */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 1, label: "Technical", icon: "1" }, 
          { id: 2, label: "Commercial", icon: "2" }, 
          { id: 3, label: "Packaging", icon: "3" }, 
          { id: 4, label: "Review", icon: "✓" }
        ].map((phase) => {
          const isActive = phase.id === activePhase;
          const isClickable = true; 
          
          return (
            <button
              key={phase.id}
              onClick={() => isClickable && setActivePhase(phase.id)}
              className={`flex items-center gap-3 min-w-[160px] rounded-lg px-4 py-3 border transition-colors ${
                isActive 
                  ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                  : isClickable 
                    ? "border-slate-200 bg-white hover:border-blue-300 cursor-pointer" 
                    : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {phase.icon}
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-blue-700" : "text-slate-400"}`}>
                  Phase {phase.id}
                </span>
                <span className={`text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                  {phase.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workspace Area */}
      {activePhase === 1 && (
        <Phase1Technical initialData={dataRef.current} onChange={handleDataChange} />
      )}
      {activePhase === 2 && (
        <Phase2Commercial initialData={dataRef.current} onChange={handleDataChange} />
      )}
      {activePhase === 3 && (
        <Phase3Packaging initialData={dataRef.current} onChange={handleDataChange} />
      )}
      {activePhase === 4 && (
        <Phase4Review key={`review-${reviewTrigger}`} data={dataRef.current} draftId={draftId} />
      )}
    </div>
  );
}

export function ProductWorkspace({ existingDraftId }: { existingDraftId?: string }) {
  return (
    <MasterDataProvider>
      <WorkspaceContent existingDraftId={existingDraftId} />
    </MasterDataProvider>
  );
}
