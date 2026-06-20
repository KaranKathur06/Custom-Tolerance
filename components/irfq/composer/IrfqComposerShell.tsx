"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Lock,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTaxonomyRegistry } from "@/lib/marketplace/use-taxonomy-registry";
import { useIrfqDraft } from "@/lib/hooks/useIrfqDraft";
import { CreationMethodSelector } from "./CreationMethodSelector";
import {
  IRFQ_COMPOSER_STEPS,
  type IrfqCreationMethod,
} from "@/lib/marketplace/irfq/types";
import { validateDraftStep } from "@/lib/marketplace/irfq/validation";
import { canUseAdvancedFilters } from "@/lib/marketplace/irfq/subscription-gates";

type IrfqComposerShellProps = {
  supplierSlug?: string | null;
};

export function IrfqComposerShell({ supplierSlug }: IrfqComposerShellProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: taxonomy } = useTaxonomyRegistry();
  const [creationMethod, setCreationMethod] = useState<IrfqCreationMethod>("manual");
  const [step, setStep] = useState(-1);
  const [showAuthWall, setShowAuthWall] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<Array<{ id: string; file_name: string }>>([]);
  const [itemDraft, setItemDraft] = useState({
    itemName: "",
    quantity: "",
    unit: "pieces",
    materialGrade: "",
    tolerance: "pm0_1mm",
  });

  const {
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
  } = useIrfqDraft(creationMethod);

  const subscriptionPlan = "free" as const;
  const progress = step < 0 ? 0 : ((step + 1) / IRFQ_COMPOSER_STEPS.length) * 100;

  useEffect(() => {
    updatePayload({ creationMethod });
  }, [creationMethod, updatePayload]);

  async function refreshFiles(id: string) {
    const res = await fetch(`/api/v2/rfqs/${id}/files`);
    const json = await res.json();
    if (json.success) setFiles(json.data ?? []);
  }

  async function goNext() {
    if (step === -1) {
      setStep(0);
      return;
    }

    const validationError = validateDraftStep(step, payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextStep = Math.min(step + 1, IRFQ_COMPOSER_STEPS.length - 1);
    updatePayload({ composerStep: nextStep });
    const saved = await saveDraft({ composerStep: nextStep });
    if (!saved && step < 6) return;

    if (step === 2 && draftId) await refreshFiles(draftId);
    setError(null);
    setStep(nextStep);
  }

  function goBack() {
    setError(null);
    if (step <= 0) setStep(-1);
    else setStep((s) => s - 1);
  }

  async function handleAddItem() {
    const id = draftId ?? (await ensureDraft());
    if (!id) return;

    if (!itemDraft.itemName.trim() || !itemDraft.quantity.trim()) {
      setError("Item name and quantity are required");
      return;
    }

    const res = await fetch(`/api/v2/rfqs/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_name: itemDraft.itemName,
        quantity: Number(itemDraft.quantity),
        unit: itemDraft.unit,
        materials: itemDraft.materialGrade
          ? [{ material_name: "Custom", material_grade: itemDraft.materialGrade, is_custom_grade: true }]
          : [],
        tolerance: itemDraft.tolerance,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to add item");
      return;
    }
    setItemDraft({ itemName: "", quantity: "", unit: "pieces", materialGrade: "", tolerance: "pm0_1mm" });
    setError(null);
  }

  async function handleFileUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    const id = draftId ?? (await ensureDraft());
    if (!id) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/v2/rfqs/${id}/files`, { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");
      }
      await refreshFiles(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (!isAuthenticated) {
      setShowAuthWall(true);
      return;
    }

    const id = draftId ?? (await ensureDraft());
    if (!id) return;

    setPublishing(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch(`/api/v2/rfqs/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to publish RFQ");
        return;
      }
      clearDraftStorage();
      setSuccessSlug(json.data?.slug ?? json.href?.replace("/rfq/", "") ?? null);
    } catch {
      setError("Network error publishing RFQ");
    } finally {
      setPublishing(false);
    }
  }

  const capabilityOptions = useMemo(
    () => taxonomy?.capabilities ?? [],
    [taxonomy?.capabilities],
  );

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (successSlug) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-2xl font-extrabold text-slate-900">RFQ Published</h1>
          <p className="mb-6 text-sm text-slate-600">
            CT-IRFQ matched suppliers to your requirement. Quotes will arrive in your dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/rfq/${successSlug}`}>
              <Button>View RFQ</Button>
            </Link>
            <Link href="/buyer/rfqs">
              <Button variant="outline">My RFQs</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthWall && !isAuthenticated) {
    const redirect = encodeURIComponent("/rfq/new");
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Sign in to publish</h1>
        <p className="mb-8 text-slate-600">Your draft is saved. Log in to publish and receive supplier matches.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/register?redirect=${redirect}`}>
            <Button className="w-full sm:w-auto">Create account</Button>
          </Link>
          <Link href={`/login?redirect=${redirect}`}>
            <Button variant="outline" className="w-full sm:w-auto">Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">CT-IRFQ™</p>
            <h1 className="text-lg font-bold text-slate-900">
              {step < 0 ? "New requirement" : `Step ${step + 1}: ${IRFQ_COMPOSER_STEPS[step]}`}
            </h1>
          </div>
          {step >= 0 ? (
            <div className="hidden w-40 sm:block">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-6 py-8">
        {supplierSlug ? (
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            Targeting supplier: <strong>{supplierSlug}</strong>
          </p>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {step === -1 ? (
            <CreationMethodSelector
              selected={creationMethod}
              onSelect={(m) => {
                setCreationMethod(m);
                updatePayload({ creationMethod: m });
              }}
              subscriptionPlan={subscriptionPlan}
            />
          ) : null}

          {step === 0 && isReady ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Product / Manufacturing Category</h2>
              <div>
                <Label>Search capabilities</Label>
                <Input
                  className="mt-1"
                  placeholder="CNC Machining, Laser Cutting…"
                  onChange={(e) => {
                    const match = capabilityOptions.find((c) =>
                      c.name.toLowerCase().includes(e.target.value.toLowerCase()),
                    );
                    if (match) updatePayload({ capabilityIds: [match.id] });
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilityOptions.slice(0, 8).map((cap) => (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => updatePayload({ capabilityIds: [cap.id] })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      payload.capabilityIds?.includes(cap.id)
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-200 text-slate-700",
                    )}
                  >
                    {cap.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 && referenceData ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Project Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Project name *</Label>
                  <Input
                    className="mt-1"
                    value={payload.projectName ?? ""}
                    onChange={(e) => updatePayload({ projectName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>RFQ title *</Label>
                  <Input
                    className="mt-1"
                    value={payload.rfqTitle ?? ""}
                    onChange={(e) => updatePayload({ rfqTitle: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Project type *</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payload.projectType ?? ""}
                    onChange={(e) => updatePayload({ projectType: e.target.value })}
                  >
                    <option value="">Select</option>
                    {referenceData.projectTypes.map((pt) => (
                      <option key={pt.slug} value={pt.slug}>{pt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Industry *</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payload.industryId ?? ""}
                    onChange={(e) => updatePayload({ industryId: e.target.value })}
                  >
                    <option value="">Select</option>
                    {(taxonomy?.industries ?? []).map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1 min-h-[100px]"
                  value={payload.description ?? ""}
                  onChange={(e) => updatePayload({ description: e.target.value })}
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Drawings & Technical Documents</h2>
              <p className="text-sm text-slate-600">PDF, STEP, DWG, DXF, STL, DOCX, XLSX, images, ZIP — max 5GB total</p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 hover:border-blue-300">
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <span className="text-sm font-medium">{uploading ? "Uploading…" : "Choose files"}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  accept=".pdf,.dxf,.dwg,.step,.stp,.iges,.igs,.stl,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={(e) => void handleFileUpload(e.target.files)}
                />
              </label>
              {files.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-600">
                  {files.map((f) => (
                    <li key={f.id}>• {f.file_name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 3 && referenceData ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Item Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Item name *</Label>
                  <Input
                    className="mt-1"
                    value={itemDraft.itemName}
                    onChange={(e) => setItemDraft((d) => ({ ...d, itemName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Material grade</Label>
                  <Input
                    className="mt-1"
                    placeholder="SS316, 6061…"
                    value={itemDraft.materialGrade}
                    onChange={(e) => setItemDraft((d) => ({ ...d, materialGrade: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={itemDraft.quantity}
                    onChange={(e) => setItemDraft((d) => ({ ...d, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={itemDraft.unit}
                    onChange={(e) => setItemDraft((d) => ({ ...d, unit: e.target.value }))}
                  >
                    {referenceData.units.map((u) => (
                      <option key={u.slug} value={u.slug}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tolerance</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={itemDraft.tolerance}
                    onChange={(e) => setItemDraft((d) => ({ ...d, tolerance: e.target.value }))}
                  >
                    {referenceData.tolerances.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => void handleAddItem()}>
                Add line item
              </Button>
            </div>
          ) : null}

          {step === 4 && referenceData ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Quality Requirements</h2>
              {[
                ["verified_supplier", "Verified Supplier"],
                ["iso_certified", "ISO Certified"],
                ["export_experience", "Export Experience"],
                ["nda_ready", "NDA Ready"],
                ["oem_experience", "OEM Experience"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.supplierRequirements?.[key])}
                    onChange={(e) =>
                      updatePayload({
                        supplierRequirements: {
                          ...payload.supplierRequirements,
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              {!canUseAdvancedFilters(subscriptionPlan) ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <Lock className="mr-1 inline h-4 w-4" />
                  Upgrade to Premium to unlock advanced supplier filters (turnover, factory size, certifications)
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 && referenceData ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Location & Delivery</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Delivery state *</Label>
                  <Input
                    className="mt-1"
                    value={payload.deliveryState ?? ""}
                    onChange={(e) => updatePayload({ deliveryState: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Delivery city *</Label>
                  <Input
                    className="mt-1"
                    value={payload.deliveryCity ?? ""}
                    onChange={(e) => updatePayload({ deliveryCity: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Incoterms</Label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={payload.deliveryMode ?? ""}
                  onChange={(e) => updatePayload({ deliveryMode: e.target.value })}
                >
                  <option value="">Select</option>
                  {referenceData.incoterms.map((i) => (
                    <option key={i.slug} value={i.slug}>{i.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(payload.supplierLocationPref?.global)}
                  onChange={(e) =>
                    updatePayload({
                      supplierLocationPref: {
                        ...payload.supplierLocationPref,
                        global: e.target.checked,
                      },
                    })
                  }
                />
                Global suppliers acceptable
              </label>
            </div>
          ) : null}

          {step === 6 && referenceData ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Commercial</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Payment terms</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payload.paymentTerms ?? ""}
                    onChange={(e) => updatePayload({ paymentTerms: e.target.value })}
                  >
                    <option value="">Select</option>
                    {referenceData.paymentTerms.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={payload.currencyCode ?? "USD"}
                    onChange={(e) => updatePayload({ currencyCode: e.target.value })}
                  >
                    {referenceData.currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Quotation deadline</Label>
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={payload.quotationDeadline ?? ""}
                    onChange={(e) => updatePayload({ quotationDeadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expected delivery date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={payload.expectedDeliveryDate ?? ""}
                    onChange={(e) => updatePayload({ expectedDeliveryDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Review & Publish</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Title</dt><dd className="font-medium">{payload.rfqTitle || payload.projectName || "—"}</dd></div>
                <div><dt className="text-slate-500">Project type</dt><dd className="font-medium">{payload.projectType || "—"}</dd></div>
                <div><dt className="text-slate-500">Delivery</dt><dd className="font-medium">{payload.deliveryCity}, {payload.deliveryState}</dd></div>
                <div><dt className="text-slate-500">Files</dt><dd className="font-medium">{files.length} attached</dd></div>
              </dl>
              <p className="text-sm text-slate-600">
                On publish, CT-IRFQ will match up to 5 suppliers (Free plan) and notify qualified manufacturers.
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step <= -1}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < IRFQ_COMPOSER_STEPS.length - 1 ? (
              <Button type="button" onClick={() => void goNext()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={() => void handlePublish()} disabled={publishing}>
                {publishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing…
                  </>
                ) : (
                  "Publish RFQ"
                )}
              </Button>
            )}
          </div>
        </div>

        {draftId ? (
          <p className="text-center text-xs text-slate-400">Draft saved · ID {draftId.slice(0, 8)}…</p>
        ) : (
          <p className="text-center text-xs text-slate-400">Progress auto-saves when you continue</p>
        )}
      </div>
    </div>
  );
}
