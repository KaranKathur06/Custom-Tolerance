"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = { params: Promise<{ productSlug: string }> };

export default function SellerProductWizardPage(_props: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const stepFromQuery = useMemo(() => {
    const raw = sp.get("step");
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 1 && n <= 4) return n;
    return 1;
  }, [sp]);

  const phase = useMemo(() => {
    if (stepFromQuery === 1) return "Phase 1";
    if (stepFromQuery === 2) return "Phase 2";
    if (stepFromQuery === 3) return "Phase 3";
    return "Review";
  }, [stepFromQuery]);


  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Creation</h1>
          <p className="mt-2 text-sm text-slate-600">
            Wizard shell placeholder. Phase-based implementation will be wired to draft autosave & review summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/seller/products")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-6">
          <div className="text-sm font-semibold text-slate-900">Current:</div>
          <div className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">{phase}</div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            { id: 1, label: "Phase 1" },
            { id: 2, label: "Phase 2" },
            { id: 3, label: "Phase 3" },
            { id: 4, label: "Review" },
          ].map((s) => {
            const active = s.id === stepFromQuery;
            const done = s.id < stepFromQuery;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`?step=${s.id}`)}
                className={
                  active
                    ? "rounded-xl border border-blue-600 bg-blue-600/10 px-4 py-4 text-left"
                    : done
                    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left"
                    : "rounded-xl border border-slate-200 bg-white px-4 py-4 text-left opacity-70"
                }
              >
                <div className={active ? "text-sm font-bold text-blue-700" : done ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-slate-700"}>
                  {s.label}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {active ? "In progress" : done ? "Completed" : "Not started"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-700">
            Next: implement the four-phase blueprint fields, autosave, independent validation, and review summary.
          </p>
        </div>
      </div>
    </div>
  );
}

