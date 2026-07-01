"use client";

import { ExternalLink, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type AgreementCheckboxProps = {
  /** Label shown on the checkbox, e.g. "Buyer Agreement" */
  label: string;
  /** URL to open when the user clicks to read the document */
  href: string;
  /** Whether the checkbox is checked (agreement accepted) */
  checked: boolean;
  /** Called when the user ticks the checkbox */
  onChange: (value: boolean) => void;
  /** ISO timestamp string set when the user first opens the document */
  viewedAt: string | null;
  /** Called when the user opens the document link — parent records the timestamp */
  onView: () => void;
  /** Optional additional description text */
  description?: string;
};

/**
 * Enterprise-grade agreement checkbox with enforced document review.
 *
 * The checkbox is DISABLED until the user has clicked to open and read the
 * linked document. Once opened, the checkbox is enabled and the user can
 * tick "I have read and agree".
 *
 * Used by both Buyer and Seller onboarding (and future Agency / Employee flows).
 * Parent is responsible for persisting viewedAt, acceptedAt, version, IP, and UA.
 */
export function AgreementCheckbox({
  label,
  href,
  checked,
  onChange,
  viewedAt,
  onView,
  description,
}: AgreementCheckboxProps) {
  const hasViewed = Boolean(viewedAt);

  const handleOpenDocument = () => {
    window.open(href, "_blank", "noopener,noreferrer");
    if (!hasViewed) {
      onView();
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        checked
          ? "border-emerald-200 bg-emerald-50/60"
          : hasViewed
            ? "border-blue-200 bg-blue-50/40"
            : "border-slate-200 bg-slate-50/50",
      )}
    >
      {/* Document Link Row */}
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 shadow-sm">
          <FileText className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleOpenDocument}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </button>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {hasViewed ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Opened
          </span>
        ) : null}
      </div>

      {/* Checkbox Row */}
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
          checked
            ? "border-emerald-300 bg-white text-emerald-800"
            : hasViewed
              ? "border-blue-200 bg-white text-slate-700 hover:border-blue-300"
              : "border-slate-200 bg-white text-slate-400 cursor-not-allowed",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!hasViewed}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-blue-600 disabled:opacity-50"
        />
        <span>
          {hasViewed
            ? "I have read and agree to the above"
            : "Please open and read the document above to enable this checkbox"}
        </span>
      </label>
    </div>
  );
}
