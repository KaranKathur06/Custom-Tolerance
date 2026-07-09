"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IrfqCreationMethod, IrfqDraftPayload, IrfqReferenceData } from "@/lib/marketplace/irfq/types";

const STORAGE_KEY = "ct_irfq_draft_id";

export function useIrfqDraft(initialMethod: IrfqCreationMethod = "manual") {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [payload, setPayload] = useState<IrfqDraftPayload>({
    creationMethod: initialMethod,
    composerStep: 0,
    currencyCode: "USD",
    privacyLevel: "public",
    supplierLocationPref: {},
    supplierRequirements: {},
    advancedSupplierFilters: {},
    capabilityIds: [],
  });
  const [referenceData, setReferenceData] = useState<IrfqReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setDraftId(stored);

    fetch("/api/v2/rfqs/reference-data")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReferenceData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/v2/rfqs/drafts/${draftId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const rfq = json.data;
        setPayload((prev) => ({
          ...prev,
          projectName: rfq.project_name ?? prev.projectName,
          rfqTitle: rfq.rfq_title ?? rfq.title ?? prev.rfqTitle,
          projectType: rfq.project_type ?? prev.projectType,
          description: rfq.description ?? prev.description,
          composerStep: rfq.composer_step ?? prev.composerStep,
          industryId: rfq.rfq_industries?.[0]?.industry_id ?? prev.industryId,
          capabilityIds: rfq.rfq_capabilities?.map((c: { capability_id: string }) => c.capability_id) ?? prev.capabilityIds,
          deliveryState: rfq.delivery_state ?? prev.deliveryState,
          deliveryCity: rfq.delivery_city ?? prev.deliveryCity,
          deliveryPostalCode: rfq.delivery_postal_code ?? prev.deliveryPostalCode,
          deliveryMode: rfq.delivery_mode ?? prev.deliveryMode,
          paymentTerms: rfq.payment_terms ?? prev.paymentTerms,
          paymentMode: rfq.payment_mode ?? prev.paymentMode,
          currencyCode: rfq.currency_code ?? prev.currencyCode,
          privacyLevel: (rfq.privacy_level as string) ?? prev.privacyLevel,
          supplierLocationPref: rfq.supplier_location_pref ?? prev.supplierLocationPref,
          supplierRequirements: rfq.supplier_requirements ?? prev.supplierRequirements,
          capabilityMatrixFilters: rfq.capability_matrix_filters ?? prev.capabilityMatrixFilters,
        }));
      })
      .catch(() => undefined);
  }, [draftId]);

  const ensureDraft = useCallback(async () => {
    if (draftId) return draftId;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/rfqs/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_method: payload.creationMethod ?? initialMethod,
          payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to create draft");
        return null;
      }
      const id = json.data.id as string;
      setDraftId(id);
      localStorage.setItem(STORAGE_KEY, id);
      return id;
    } catch {
      setError("Network error creating draft");
      return null;
    } finally {
      setSaving(false);
    }
  }, [draftId, initialMethod, payload]);

  const saveDraft = useCallback(
    async (patch?: Partial<IrfqDraftPayload>) => {
      const next = patch ? { ...payload, ...patch } : payload;
      if (patch) setPayload(next);

      const id = draftId ?? (await ensureDraft());
      if (!id) return false;

      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/v2/rfqs/drafts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: next }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "Failed to save draft");
          return false;
        }
        return true;
      } catch {
        setError("Network error saving draft");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [draftId, ensureDraft, payload],
  );

  const updatePayload = useCallback((patch: Partial<IrfqDraftPayload>) => {
    setPayload((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearDraftStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDraftId(null);
  }, []);

  const isReady = useMemo(() => !loading && Boolean(referenceData), [loading, referenceData]);

  return {
    draftId,
    payload,
    referenceData,
    loading,
    saving,
    error,
    isReady,
    setError,
    updatePayload,
    saveDraft,
    ensureDraft,
    clearDraftStorage,
  };
}
