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
            capability: null,
            materials: [],
            isFeatured: false,
            isVisible: false,
          }),
        });

        if (!res.ok) throw new Error("Failed to create draft");
        
        const data = (await res.json()) as { product?: { id: string } };
        
        if (isMounted && data.product?.id) {
          setDraftId(data.product.id);
          // Don't redirect immediately to avoid flickering, but update the URL silently if possible
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
      // Map frontend data structure to backend schema
      const payload: any = {};
      
      // Phase 1
      if (dataToSave.productName !== undefined) payload.productName = dataToSave.productName;
      if (dataToSave.minPrice !== undefined) payload.estimatedPrice = Number(dataToSave.minPrice) || null;
      if (dataToSave.capabilities && dataToSave.capabilities.length > 0) {
        payload.capability = dataToSave.capabilities[0]; // Single capability mapping
      }
      if (dataToSave.tolerance !== undefined) payload.toleranceCapability = dataToSave.tolerance;
      
      // Phase 2
      if (dataToSave.moq !== undefined) payload.moq = Number(dataToSave.moq) || null;
      if (dataToSave.productionCapacity !== undefined) payload.productionCapacity = Number(dataToSave.productionCapacity) || null;
      if (dataToSave.productionCapacityUnit !== undefined) payload.productionCapacityUnit = dataToSave.productionCapacityUnit;
      if (dataToSave.leadTime !== undefined) payload.leadTime = dataToSave.leadTime;
      if (dataToSave.customTolerance !== undefined) payload.customTolerance = dataToSave.customTolerance;
      if (dataToSave.certifications !== undefined) payload.certifications = dataToSave.certifications;

      // Phase 3
      if (dataToSave.quantityAvailable !== undefined) payload.quantityAvailable = Number(dataToSave.quantityAvailable) || null;
      // Note: packagingOptions is not currently mapped to the backend schema in route.ts.

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
    // Only trigger re-render if we are actively viewing the Review phase
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
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-md inline-block">
              Unable to initialize draft in background. Your changes may not save.
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
        {[{ id: 1, label: "Technical" }, { id: 2, label: "Commercial" }, { id: 3, label: "Packaging" }, { id: 4, label: "Review" }].map((phase) => {
          const isActive = phase.id === activePhase;
          const isClickable = true; // All phases clickable now
          
          return (
            <button
              key={phase.id}
              onClick={() => isClickable && setActivePhase(phase.id)}
              className={`flex flex-col items-start min-w-[120px] rounded-lg px-4 py-2 border transition-colors ${
                isActive 
                  ? "border-blue-600 bg-blue-50/50" 
                  : isClickable 
                    ? "border-slate-200 bg-white hover:border-blue-300 cursor-pointer" 
                    : "border-slate-200 bg-white opacity-60 cursor-not-allowed"
              }`}
            >
              <span className={`text-xs font-bold ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                Phase {phase.id}
              </span>
              <span className={`text-sm ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                {phase.label}
              </span>
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
