"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { MasterDataProvider } from "./MasterDataProvider";
import { Phase1Technical, Phase1Data } from "./Phase1Technical";
import { Phase2Commercial, Phase2Data } from "./Phase2Commercial";
import { Phase3Packaging, Phase3Data } from "./Phase3Packaging";
import { Phase4Review } from "./Phase4Review";
import { CheckCircle2, Loader2, Save, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { canEnterPhase, getMissingPhaseFields } from "@/lib/services/product-service";
import { canResumeProductDraft } from "@/lib/services/product-draft-service";

type ProductData = Partial<Phase1Data> & Partial<Phase2Data> & Partial<Phase3Data>;

const AUTOSAVE_DEBOUNCE_MS = 500;
const ERROR_COOLDOWN_MS = 5000;

function WorkspaceContent({ existingDraftId }: { existingDraftId?: string }) {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(existingDraftId || null);
  const [draftError, setDraftError] = useState(false);
  const [draftErrorMessage, setDraftErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activePhase, setActivePhase] = useState<number>(1);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(existingDraftId));
  
  // A ref to store the latest data so the background autosave can access it
  const dataRef = useRef<ProductData>({});
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  
  // Debounce timer for autosave — prevents rapid-fire requests on every keystroke
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Error cooldown — after a save failure, suppress autosave for a few seconds
  const errorCooldownUntilRef = useRef<number>(0);
  
  // Track active phase to trigger render for Review tab only
  const [reviewTrigger, setReviewTrigger] = useState(0);

  useEffect(() => {
    if (!existingDraftId) {
      setIsLoadingDraft(false);
      return;
    }

    let isMounted = true;

    async function loadDraft() {
      try {
        const response = await fetch("/api/dashboard/seller/products");
        if (!response.ok) throw new Error("Failed to load product draft");

        const result = (await response.json()) as { products?: Record<string, any>[] };
        const product = result.products?.find((item) => item.id === existingDraftId);
        if (!product || !canResumeProductDraft({ id: product.id, status: product.approval_status })) {
          throw new Error("Product draft is unavailable");
        }

        const hydratedData: ProductData = {
          productName: product.product_name ?? "",
          priceType: product.price_type ?? "ask_for_price",
          minPrice: product.min_price == null ? "" : String(product.min_price),
          maxPrice: product.max_price == null ? "" : String(product.max_price),
          currency: product.currency ?? "USD",
          priceUnit: product.price_unit ?? "per_piece",
          capabilities: (product.product_capabilities ?? []).map((item: any) => item.capability_id),
          industries: (product.product_industries ?? []).map((item: any) => item.industry_id),
          materials: (product.product_materials ?? []).map((item: any) => item.material_name),
          grades: (product.product_grades ?? []).map((item: any) => item.grade_name),
          images: (product.product_images ?? []).map((item: any, index: number) => ({
            url: item.url,
            path: item.storage_path ?? "",
            isPrimary: Boolean(item.is_primary),
            localId: `${existingDraftId}-image-${index}`,
          })),
          specification: product.specification ?? "",
          tolerance: product.tolerance_capability ?? "",
          qualityCertificate: product.quality_certificate ?? "",
          brandMarking: product.brand_marking ?? "",
          brandMarkingOther: product.brand_marking_other ?? "",
          diesAndTools: product.dies_and_tools ?? "",
          estimatedToolCost: product.estimated_tool_cost == null ? "" : String(product.estimated_tool_cost),
          toolOwnership: product.tool_ownership ?? "",
          toolLeadTime: product.tool_lead_time ?? "",
          moq: product.moq == null ? "" : String(product.moq),
          productionCapacity: product.monthly_capacity == null ? "" : String(product.monthly_capacity),
          productionCapacityUnit: product.production_capacity_unit ?? "pcs",
          leadTime: product.lead_time ?? "",
          description: product.description ?? "",
          countryOfOrigin: product.country_of_origin ?? "",
          freeSample: product.free_sample ? "yes" : "no",
          sampleShippingCost: product.sample_shipping_cost ?? "",
          thirdPartyInspection: product.third_party_inspection ? "yes" : "no",
          paymentTerms: (product.product_payment_terms ?? []).map((item: any) => item.payment_term_id),
          incoterms: (product.product_incoterms ?? []).map((item: any) => item.incoterm_id),
          deliveryTerms: product.delivery_terms ?? "",
          weightValue: product.weight_value == null ? "" : String(product.weight_value),
          weightUnit: product.weight_unit ?? "kg",
          dimLength: product.dim_length == null ? "" : String(product.dim_length),
          dimWidth: product.dim_width == null ? "" : String(product.dim_width),
          dimHeight: product.dim_height == null ? "" : String(product.dim_height),
          dimUnit: product.dim_unit ?? "mm",
          shippingType: product.shipping_type ?? "packed",
          primaryPackaging: product.primary_packaging ?? "",
          secondaryPackaging: product.secondary_packaging ?? "",
          packagingNotes: product.packaging_notes ?? "",
        };

        if (isMounted) {
          dataRef.current = hydratedData;
          setActivePhase(product.description || product.moq ? 2 : 1);
          setLastSaved(product.updated_at ? new Date(product.updated_at) : null);
        }
      } catch (error) {
        console.error("Draft loading failed", error);
        if (isMounted) {
          setDraftError(true);
          setDraftErrorMessage(error instanceof Error ? error.message : "Unable to load product draft.");
        }
      } finally {
        if (isMounted) setIsLoadingDraft(false);
      }
    }

    void loadDraft();
    return () => { isMounted = false; };
  }, [existingDraftId]);

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

  const triggerAutosave = useCallback(async (dataToSave: ProductData, targetDraftId?: string): Promise<boolean> => {
    const idToUse = targetDraftId || draftId;
    if (!idToUse) return false;

    const saveOperation = async (): Promise<boolean> => {
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
        payload.priceType = dataToSave.priceType;
        payload.minPrice = dataToSave.priceType === "ask_for_price" ? null : Number(dataToSave.minPrice) || null;
        payload.maxPrice = dataToSave.priceType === "price_range" ? Number(dataToSave.maxPrice) || null : null;
      }
      if (dataToSave.currency !== undefined) payload.currency = dataToSave.currency;
      if (dataToSave.priceUnit !== undefined) payload.priceUnit = dataToSave.priceUnit;
      
      // Combine properties for the current schema
      if (dataToSave.capabilities !== undefined) {
        // The old schema has a string 'capability' - we pick the first one for now
        payload.capability = dataToSave.capabilities.length > 0 ? dataToSave.capabilities[0] : null;
        payload.capabilities = dataToSave.capabilities; // if we update DB to use array
      }
      
      if (dataToSave.materials !== undefined) payload.materials = dataToSave.materials;
      if (dataToSave.tolerance !== undefined) payload.tolerance = dataToSave.tolerance;
      if (dataToSave.images !== undefined) {
        payload.images = dataToSave.images;
      }
      if (dataToSave.industries !== undefined) payload.industries = dataToSave.industries;
      if (dataToSave.grades !== undefined) payload.grades = dataToSave.grades;
      if (dataToSave.specification !== undefined) payload.specification = dataToSave.specification;
      if (dataToSave.qualityCertificate !== undefined) payload.qualityCertificate = dataToSave.qualityCertificate;
      if (dataToSave.brandMarking !== undefined) payload.brandMarking = dataToSave.brandMarking;
      if (dataToSave.brandMarkingOther !== undefined) payload.brandMarkingOther = dataToSave.brandMarkingOther;
      if (dataToSave.diesAndTools !== undefined) payload.diesAndTools = dataToSave.diesAndTools;
      if (dataToSave.estimatedToolCost !== undefined) payload.estimatedToolCost = dataToSave.estimatedToolCost;
      if (dataToSave.toolOwnership !== undefined) payload.toolOwnership = dataToSave.toolOwnership;
      if (dataToSave.toolLeadTime !== undefined) payload.toolLeadTime = dataToSave.toolLeadTime;

      // Phase 2
      if (dataToSave.moq !== undefined) payload.moq = Number(dataToSave.moq) || null;
      if (dataToSave.productionCapacity !== undefined) payload.productionCapacity = Number(dataToSave.productionCapacity) || null;
      if (dataToSave.productionCapacityUnit !== undefined) payload.productionCapacityUnit = dataToSave.productionCapacityUnit;
      if (dataToSave.leadTime !== undefined) payload.leadTime = dataToSave.leadTime;
      if (dataToSave.freeSample !== undefined) payload.freeSample = dataToSave.freeSample;
      if (dataToSave.sampleShippingCost !== undefined) payload.sampleShippingCost = dataToSave.sampleShippingCost;
      if (dataToSave.thirdPartyInspection !== undefined) payload.thirdPartyInspection = dataToSave.thirdPartyInspection;
      if (dataToSave.incoterms !== undefined) payload.incoterms = dataToSave.incoterms;
      if (dataToSave.deliveryTerms !== undefined) payload.deliveryTerms = dataToSave.deliveryTerms;
      
      // Convert arrays for legacy string[] cols
      if (dataToSave.paymentTerms !== undefined) payload.paymentTerms = dataToSave.paymentTerms;
      
      // Phase 3
      if (dataToSave.weightValue !== undefined) payload.quantityAvailable = Number(dataToSave.weightValue) || null;
      if (dataToSave.weightValue !== undefined) payload.weightValue = dataToSave.weightValue;
      if (dataToSave.weightUnit !== undefined) payload.weightUnit = dataToSave.weightUnit;
      if (dataToSave.dimLength !== undefined) payload.dimLength = dataToSave.dimLength;
      if (dataToSave.dimWidth !== undefined) payload.dimWidth = dataToSave.dimWidth;
      if (dataToSave.dimHeight !== undefined) payload.dimHeight = dataToSave.dimHeight;
      if (dataToSave.dimUnit !== undefined) payload.dimUnit = dataToSave.dimUnit;
      if (dataToSave.shippingType !== undefined) payload.shippingType = dataToSave.shippingType;
      if (dataToSave.primaryPackaging !== undefined) payload.primaryPackaging = dataToSave.primaryPackaging;
      if (dataToSave.secondaryPackaging !== undefined) payload.secondaryPackaging = dataToSave.secondaryPackaging;
      if (dataToSave.packagingNotes !== undefined) payload.packagingNotes = dataToSave.packagingNotes;

        const res = await fetch(`/api/dashboard/seller/products?id=${idToUse}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const responseBody = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(responseBody?.error || `Autosave failed (${res.status})`);
        }

        setLastSaved(new Date());
        setDraftError(false);
        setDraftErrorMessage(null);
        return true;
      } catch (err) {
        console.error("Autosave failed", err);
        setDraftError(true);
        setDraftErrorMessage(err instanceof Error ? err.message : "Unable to save this product draft.");
        // Set error cooldown to prevent rapid-fire retries
        errorCooldownUntilRef.current = Date.now() + ERROR_COOLDOWN_MS;
        return false;
      } finally {
        setIsSaving(false);
      }
    };

    const queuedSave = saveQueueRef.current.then(saveOperation, saveOperation);
    saveQueueRef.current = queuedSave.catch(() => false);
    return queuedSave;
  }, [draftId]);

  const handleDataChange = useCallback((newData: ProductData) => {
    dataRef.current = { ...dataRef.current, ...newData };
    if (activePhase === 4) {
      setReviewTrigger(prev => prev + 1);
    }

    // Debounce autosave — don't fire on every keystroke
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If in error cooldown, delay until cooldown expires
    const now = Date.now();
    const cooldownRemaining = Math.max(0, errorCooldownUntilRef.current - now);
    const delay = Math.max(AUTOSAVE_DEBOUNCE_MS, cooldownRemaining);

    debounceTimerRef.current = setTimeout(() => {
      triggerAutosave(dataRef.current);
    }, delay);
  }, [triggerAutosave, activePhase]);

  const saveDraft = async () => {
    if (isSaving || !draftId) return false;
    return triggerAutosave(dataRef.current);
  };

  const saveAndContinue = async () => {
    if (isSaving || !draftId) return;
    const nextPhase = Math.min(4, activePhase + 1);
    if (nextPhase === activePhase) return;
    if (!canEnterPhase(dataRef.current, nextPhase)) {
      setDraftError(true);
      const missing = getMissingPhaseFields(dataRef.current, nextPhase);
      setDraftErrorMessage(
        missing.length > 0
          ? `Complete these fields before continuing: ${missing.join(", ")}.`
          : "Complete the required fields in this phase before continuing.",
      );
      return;
    }
    const saved = await saveDraft();
    if (saved) {
      setDraftError(false);
      setActivePhase(nextPhase);
    }
  };

  if (isLoadingDraft) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm">Loading product draft...</p>
      </div>
    );
  }

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
              <span className="font-semibold block mb-1">Draft save needs attention</span>
              <span>{draftErrorMessage || "Unable to save this product draft. Your changes are still on this page."}</span>
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={isSaving || !draftId}
                className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Retry save
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> <span className="text-blue-600">Saving...</span></>
            ) : draftError ? (
              <><AlertCircle className="h-4 w-4 text-red-500" /> <span className="text-red-600">Save failed — use Retry below or your changes are safe on this page.</span></>
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
          const isClickable = canEnterPhase(dataRef.current, phase.id);

          return (
            <button
              key={phase.id}
              disabled={!isClickable}
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

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void saveDraft().then((saved) => saved && router.push("/dashboard/seller/products"))}
          disabled={isSaving || !draftId}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Draft"}
        </button>
        {activePhase < 4 ? (
          <button
            type="button"
            onClick={() => void saveAndContinue()}
            disabled={isSaving || !draftId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save & Continue"}
          </button>
        ) : null}
      </div>
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
