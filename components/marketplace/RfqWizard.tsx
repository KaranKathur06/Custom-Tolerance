"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTaxonomyRegistry } from "@/lib/marketplace/use-taxonomy-registry";
import { useGuestRfq } from "@/lib/hooks/useGuestRfq";
import {
  clearGuestRfqDraft,
  guestDraftToApiPayload,
  type RfqFrequency,
} from "@/lib/marketplace/guest-rfq";

const STEPS = ["Product", "Commercial", "Logistics", "Files", "Frequency"] as const;
const FREQUENCY_OPTIONS: { value: RfqFrequency; label: string }[] = [
  { value: "one_time", label: "One time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

type RfqWizardProps = {
  supplierSlug?: string | null;
};

export function RfqWizard({ supplierSlug }: RfqWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resume = searchParams.get("resume") === "1";
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: taxonomy } = useTaxonomyRegistry();
  const { draft, updateDraft, resetDraft, hydrated } = useGuestRfq(supplierSlug);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthWall, setShowAuthWall] = useState(false);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (resume && isAuthenticated && !successSlug && !submitting) {
      void postAuthenticatedRfq();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, isAuthenticated, hydrated, authLoading]);

  async function postAuthenticatedRfq() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestDraftToApiPayload(draft)),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to post RFQ");
        return;
      }
      clearGuestRfqDraft();
      setSuccessSlug(json.data?.slug ?? json.href?.replace("/rfq/", "") ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function validateStep(index: number): boolean {
    if (index === 0) {
      if (!draft.productName.trim()) {
        setError("Product name is required");
        return false;
      }
      if (!draft.description.trim()) {
        setError("Please describe your requirement");
        return false;
      }
    }
    if (index === 1) {
      if (!draft.quantity.trim()) {
        setError("Quantity is required");
        return false;
      }
    }
    if (index === 2) {
      if (!draft.deliveryState.trim() || !draft.deliveryCity.trim()) {
        setError("Delivery state and city are required");
        return false;
      }
    }
    setError(null);
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFinalSubmit() {
    if (!validateStep(step)) return;

    updateDraft({
      pendingFileNames: selectedFiles.map((f) => f.name),
    });

    if (!isAuthenticated) {
      setShowAuthWall(true);
      return;
    }

    await postAuthenticatedRfq();
  }

  if (successSlug) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-2xl font-extrabold text-slate-900">RFQ Posted!</h1>
          <p className="mb-6 text-sm text-slate-600">
            Your requirement is live. Verified suppliers can now submit quotes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/rfq/${successSlug}`}>
              <Button>View RFQ</Button>
            </Link>
            <Link href="/buyer">
              <Button variant="outline">Buyer dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthWall && !isAuthenticated) {
    const redirect = encodeURIComponent("/rfq/new?resume=1");
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <ShieldCheck className="mx-auto mb-4 h-14 w-14 text-blue-600" />
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Almost there</h1>
        <p className="mb-2 text-slate-600">
          Your RFQ is saved locally. Create a free account or log in to publish it to
          suppliers.
        </p>
        <p className="mb-8 text-xs text-slate-500">
          Draft auto-saved · {draft.productName || "Untitled requirement"}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/register?redirect=${redirect}`}>
            <Button className="w-full sm:w-auto">Create account</Button>
          </Link>
          <Link href={`/login?redirect=${redirect}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              Log in
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setShowAuthWall(false)}
          className="mt-6 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to wizard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Post requirement</h1>
            <p className="text-xs text-slate-500">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <div className="hidden w-32 sm:block">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
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
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Product details</h2>
              <div>
                <Label htmlFor="productName">Product name *</Label>
                <Input
                  id="productName"
                  className="mt-1"
                  value={draft.productName}
                  onChange={(e) => updateDraft({ productName: e.target.value })}
                  placeholder="e.g. SS304 CNC machined bracket"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="materialGrade">Material grade</Label>
                  <Input
                    id="materialGrade"
                    className="mt-1"
                    value={draft.materialGrade}
                    onChange={(e) => updateDraft({ materialGrade: e.target.value })}
                    placeholder="e.g. SS304, EN8"
                  />
                </div>
                <div>
                  <Label htmlFor="process">Manufacturing process</Label>
                  <select
                    id="process"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={draft.capabilityId}
                    onChange={(e) => {
                      const cap = taxonomy?.capabilities.find((c) => c.id === e.target.value);
                      updateDraft({
                        capabilityId: e.target.value,
                        manufacturingProcess: cap?.name ?? "",
                      });
                    }}
                  >
                    <option value="">Select process</option>
                    {(taxonomy?.capabilities ?? []).map((cap) => (
                      <option key={cap.id} value={cap.id}>
                        {cap.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={draft.industryId}
                  onChange={(e) => updateDraft({ industryId: e.target.value })}
                >
                  <option value="">Select industry</option>
                  {(taxonomy?.industries ?? []).map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  className="mt-1 min-h-[120px]"
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                  placeholder="Tolerances, surface finish, certifications…"
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Commercial details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    className="mt-1"
                    value={draft.quantity}
                    onChange={(e) => updateDraft({ quantity: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <select
                    id="unit"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={draft.unit}
                    onChange={(e) => updateDraft({ unit: e.target.value })}
                  >
                    <option value="MT">MT</option>
                    <option value="KG">KG</option>
                    <option value="PCS">PCS</option>
                    <option value="SET">SET</option>
                    <option value="LOT">LOT</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.moqRequired}
                  onChange={(e) => updateDraft({ moqRequired: e.target.checked })}
                />
                Supplier must meet MOQ requirement
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="budgetMin">Budget min (₹, optional)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    className="mt-1"
                    value={draft.budgetMin}
                    onChange={(e) => updateDraft({ budgetMin: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budgetMax">Budget max (₹, optional)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    className="mt-1"
                    value={draft.budgetMax}
                    onChange={(e) => updateDraft({ budgetMax: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Logistics</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="deliveryState">Delivery state *</Label>
                  <Input
                    id="deliveryState"
                    className="mt-1"
                    value={draft.deliveryState}
                    onChange={(e) => updateDraft({ deliveryState: e.target.value })}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryCity">Delivery city *</Label>
                  <Input
                    id="deliveryCity"
                    className="mt-1"
                    value={draft.deliveryCity}
                    onChange={(e) => updateDraft({ deliveryCity: e.target.value })}
                    placeholder="Pune"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="deliveryDate">Required delivery date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  className="mt-1"
                  value={draft.deliveryDate}
                  onChange={(e) => updateDraft({ deliveryDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <select
                  id="timeline"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={draft.deliveryTimeline}
                  onChange={(e) => updateDraft({ deliveryTimeline: e.target.value })}
                >
                  <option value="">Select timeline</option>
                  <option value="immediate">Immediate (1–3 days)</option>
                  <option value="1-week">Within 1 week</option>
                  <option value="2-weeks">Within 2 weeks</option>
                  <option value="1-month">Within 1 month</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Attachments</h2>
              <p className="text-sm text-slate-600">
                Upload drawings or specs (PDF, DXF, DWG, STEP, IGES, images). Files upload
                after you sign in.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 hover:border-blue-300">
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Choose files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.dxf,.dwg,.step,.stp,.iges,.igs,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                />
              </label>
              {selectedFiles.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-600">
                  {selectedFiles.map((f) => (
                    <li key={f.name}>• {f.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Order frequency</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateDraft({ frequency: opt.value })}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors",
                      draft.frequency === opt.value
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleFinalSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…
                  </>
                ) : (
                  "Submit requirement"
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Draft auto-saves in your browser · No account needed until submit
        </p>
        <button
          type="button"
          onClick={resetDraft}
          className="mx-auto block text-xs text-slate-400 hover:text-slate-600"
        >
          Clear saved draft
        </button>
      </div>
    </div>
  );
}
