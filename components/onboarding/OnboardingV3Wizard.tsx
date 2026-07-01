"use client";

import type React from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  FileWarning,
  ShieldCheck,
  X,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  CompletionResult,
  OnboardingStepDefinition,
} from "@/lib/marketplace/onboarding-v3";

/* ────────────────────────────────────────────────────────────────────────
   WizardShell — Top stepper, wide form, sticky trust panel
   ──────────────────────────────────────────────────────────────────────── */

export type OnboardingErrorType =
  | "validation"
  | "gst_api"
  | "server"
  | "network"
  | "generic";

export function WizardShell({
  title,
  subtitle,
  steps,
  activeStep,
  completion,
  trustItems,
  validatedSteps = [],
  globalError,
  globalErrorType = "generic",
  roleLabel = "Seller Onboarding",
  onClearGlobalError,
  onRetry,
  onSaveDraft,
  onStepClick,
  children,
}: {
  title: string;
  subtitle: string;
  steps: OnboardingStepDefinition<string>[];
  activeStep: string;
  completion: CompletionResult;
  trustItems: Array<{
    label: string;
    verified?: boolean;
    status?: "pending" | "otp_sent" | "verified" | "failed";
    statusLabel?: string;
  }>;
  validatedSteps?: string[];
  globalError?: string | null;
  globalErrorType?: OnboardingErrorType;
  /** Displayed in the top-left banner, e.g. "Buyer Onboarding" or "Seller Onboarding" */
  roleLabel?: string;
  onClearGlobalError?: () => void;
  onRetry?: () => void;
  onSaveDraft?: () => void;
  onStepClick?: (stepKey: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header bar ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-10 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              {roleLabel}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Profile strength</span>
              <span>{completion.overallPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-700 transition-all"
                style={{ width: `${completion.overallPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Horizontal stepper ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1480px] px-10">
          <HorizontalStepper
            steps={steps}
            activeStep={activeStep}
            completion={completion}
            validatedSteps={validatedSteps}
            onStepClick={onStepClick}
          />
        </div>
      </div>

      {/* ── Sticky top summary system (migration-safe) ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1480px] px-10">
          <div className="py-3">
            <StickyOnboardingSummary
              trustItems={trustItems}
              completion={completion}
              validatedSteps={validatedSteps}
            />
          </div>
        </div>
      </div>

      {/* ── Main content: Form + Trust Panel ── */}
      <main className="mx-auto max-w-[1480px] px-10 py-8">
        <div className="flex gap-8">
          {/* Form area */}
          <section className="min-w-0 flex-1">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
              {globalError ? (
                <GlobalErrorBanner
                  error={globalError}
                  errorType={globalErrorType}
                  onDismiss={onClearGlobalError}
                  onRetry={onRetry}
                  onSaveDraft={onSaveDraft}
                />
              ) : null}
              {children}
            </div>
          </section>

          {/* Legacy sidebar (kept during migration) */}
          <aside className="hidden w-[320px] shrink-0 lg:block">
            <div className="sticky top-[100px] space-y-4">
              <TrustPanel trustItems={trustItems} />
              <CompletionPanel completion={completion} />
              <MissingItemsPanel completion={completion} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Horizontal Stepper
   ──────────────────────────────────────────────────────────────────────── */

function HorizontalStepper({
  steps,
  activeStep,
  completion,
  validatedSteps,
  onStepClick,
}: {
  steps: OnboardingStepDefinition<string>[];
  activeStep: string;
  completion: CompletionResult;
  validatedSteps: string[];
  onStepClick?: (stepKey: string) => void;
}) {
  return (
    <nav
      className="flex items-center overflow-x-auto py-0"
      aria-label="Onboarding steps"
    >
      {steps.map((step, index) => {
        const section = completion.sections.find(
          (item) => item.key === step.key,
        );
        const isActive = activeStep === step.key;
        const isValidated = validatedSteps.includes(step.key);
        const percent = section?.percent ?? 0;
        const isComplete = isValidated && percent >= 100;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick?.(step.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap px-3 py-4 text-sm font-medium transition-colors",
                isActive
                  ? "text-blue-700"
                  : isComplete
                    ? "text-emerald-700"
                    : "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  isComplete
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                      : "border-slate-300 bg-slate-50 text-slate-400",
                )}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(isActive && "font-semibold text-emerald-800")}
              >
                {step.title}
              </span>
            </button>
            {!isLast ? (
              <div
                className={cn(
                  "h-px w-6",
                  isComplete ? "bg-emerald-300" : "bg-slate-200",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Global Error Banner — Friendly, never exposes technical errors
   ──────────────────────────────────────────────────────────────────────── */

function GlobalErrorBanner({
  error,
  errorType,
  onDismiss,
  onRetry,
  onSaveDraft,
}: {
  error: string;
  errorType: OnboardingErrorType;
  onDismiss?: () => void;
  onRetry?: () => void;
  onSaveDraft?: () => void;
}) {
  const isTechnicalError =
    errorType === "server" ||
    errorType === "network" ||
    /json|parse|stack|trace|unexpected|syntaxerror|typeerror|referenceerror|500|502|503|econnrefused/i.test(
      error,
    );

  const titleByType: Record<OnboardingErrorType, string> = {
    validation: "Please check the following",
    gst_api: "GST API Error",
    server: "Server Error",
    network: "Network Error",
    generic: isTechnicalError
      ? "Something went wrong"
      : "Please check the following",
  };

  const messageByType: Record<OnboardingErrorType, string> = {
    validation: error,
    gst_api:
      "Unable to verify GST right now. Please try again in a few minutes. If the issue persists, contact support.",
    server:
      "Something went wrong while saving your onboarding. Your information has not been lost. Please try again.",
    network:
      "Unable to connect to server. Please check your internet connection.",
    generic: isTechnicalError
      ? "Something went wrong while saving your onboarding. Your information has not been lost. Please try again."
      : error,
  };

  const title = titleByType[errorType] ?? titleByType.generic;
  const displayMessage = messageByType[errorType] ?? messageByType.generic;
  const showRetry =
    errorType === "server" ||
    errorType === "network" ||
    errorType === "gst_api" ||
    isTechnicalError;

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-4 py-3 text-red-800 shadow-sm"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{displayMessage}</p>
        {showRetry ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={onRetry}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {errorType === "gst_api" ? "Retry Verification" : "Retry"}
              </Button>
            ) : null}
            {onSaveDraft && errorType === "server" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={onSaveDraft}
              >
                Save Draft
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-red-600 hover:bg-red-100"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Sticky Onboarding Summary (migration-safe wrapper)
   - Renders existing info in a compact top bar.
   - Keeps legacy sidebar intact to avoid regressions.
   ──────────────────────────────────────────────────────────────────────── */

function StickyOnboardingSummary({
  trustItems,
  completion,
  validatedSteps,
}: {
  trustItems: Array<{
    label: string;
    verified?: boolean;
    status?: "pending" | "otp_sent" | "verified" | "failed";
    statusLabel?: string;
  }>;
  completion: CompletionResult;
  validatedSteps: string[];
}) {
  const primaryTrust = trustItems.slice(0, 4);
  const allValidated = validatedSteps.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-700" />
          <h2 className="text-sm font-bold text-slate-950">
            Onboarding progress
          </h2>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
            Registration strength: {completion.overallPercent}%
          </div>
          {allValidated ? (
            <div className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              Steps saved
            </div>
          ) : null}
        </div>
      </div>

      <div className="w-full sm:w-auto">
        <div className="flex flex-wrap gap-2">
          {primaryTrust.map((item) => {
            const status =
              item.status ?? (item.verified ? "verified" : "pending");
            const statusLabel =
              item.statusLabel ??
              (status === "otp_sent"
                ? "OTP Sent"
                : status === "failed"
                  ? "Verification Failed"
                  : status === "verified"
                    ? "Verified"
                    : "Pending");

            return (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <span className="truncate text-slate-600">{item.label}</span>
                <Badge
                  variant={
                    status === "verified"
                      ? "success"
                      : status === "failed"
                        ? "destructive"
                        : status === "otp_sent"
                          ? "warning"
                          : "outline"
                  }
                  className={cn(
                    status === "verified" && "bg-emerald-600",
                    status === "otp_sent" && "bg-amber-500",
                    status === "failed" && "bg-red-600",
                    status === "pending" && "border-slate-200 text-slate-500",
                  )}
                >
                  {statusLabel}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* subtle hint: legacy sections remain in sidebar for migration safety */}
        <p className="mt-2 text-xs text-slate-500">
          Trust & missing requirements are also shown on the right panel
          (migration-safe).
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Trust Panel
   ──────────────────────────────────────────────────────────────────────── */

function TrustPanel({
  trustItems,
}: {
  trustItems: Array<{
    label: string;
    verified?: boolean;
    status?: "pending" | "otp_sent" | "verified" | "failed";
    statusLabel?: string;
  }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue-700" />
        <h2 className="text-sm font-bold text-slate-950">Trust checks</h2>
      </div>
      <div className="mt-4 space-y-2">
        {trustItems.map((item) => {
          const status =
            item.status ?? (item.verified ? "verified" : "pending");
          const statusLabel =
            item.statusLabel ??
            (status === "otp_sent"
              ? "OTP Sent"
              : status === "failed"
                ? "Verification Failed"
                : status === "verified"
                  ? "Verified"
                  : "Pending");

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-slate-600">{item.label}</span>
              <Badge
                variant={
                  status === "verified"
                    ? "success"
                    : status === "failed"
                      ? "destructive"
                      : status === "otp_sent"
                        ? "warning"
                        : "outline"
                }
                className={cn(
                  status === "verified" && "bg-emerald-600",
                  status === "otp_sent" && "bg-amber-500",
                  status === "failed" && "bg-red-600",
                  status === "pending" && "border-slate-200 text-slate-500",
                )}
              >
                {statusLabel}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Completion Panel
   ──────────────────────────────────────────────────────────────────────── */

function CompletionPanel({ completion }: { completion: CompletionResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-950">Completion score</h2>
      <div className="mt-4 space-y-3">
        {completion.sections.map((section) => (
          <div key={section.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                {section.label}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  section.percent >= 100
                    ? "text-emerald-600"
                    : "text-slate-900",
                )}
              >
                {section.percent}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  section.percent >= 100 ? "bg-emerald-600" : "bg-amber-500",
                )}
                style={{ width: `${section.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Missing Items Panel
   ──────────────────────────────────────────────────────────────────────── */

function MissingItemsPanel({ completion }: { completion: CompletionResult }) {
  const missing = completion.sections.flatMap((section) =>
    section.missingFields.map((field) => ({ section: section.label, field })),
  );

  if (missing.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-950">
            All required items complete
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <FileWarning className="h-4 w-4 text-red-600" />
        <h2 className="text-sm font-bold text-slate-950">Missing items</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">Still required:</p>
      <ul className="mt-2 space-y-1.5">
        {missing.map((item, index) => (
          <li
            key={`${item.section}-${item.field}-${index}`}
            className="flex items-start gap-2 text-xs text-slate-700"
          >
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-500" />
            <span>
              <span className="font-medium">
                {formatMissingFieldLabel(item.field)}
              </span>
              <span className="text-slate-400"> · {item.section}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatMissingFieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

/* ────────────────────────────────────────────────────────────────────────
   Shared Form Primitives
   ──────────────────────────────────────────────────────────────────────── */

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600",
        error ? "border-red-300 focus:ring-red-200" : "border-slate-200",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function MultiSelectChips({
  options,
  value,
  onChange,
  error,
}: {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        error && "rounded-lg border border-red-200 p-2",
      )}
    >
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange(
                selected
                  ? value.filter((item) => item !== option)
                  : [...value, option],
              )
            }
            className={cn(
              "min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-blue-700 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {selected ? (
              <Check className="mr-1 inline h-3.5 w-3.5" />
            ) : (
              <Circle className="mr-1 inline h-3 w-3" />
            )}
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function TextInput({
  error,
  ...props
}: React.ComponentProps<typeof Input> & { error?: boolean }) {
  return (
    <Input
      {...props}
      className={cn(
        "border-slate-200 focus-visible:ring-blue-600",
        error ? "border-red-300 focus-visible:ring-red-200" : "",
        props.className,
      )}
    />
  );
}

export function WizardActions({
  saving,
  canBack,
  canNext,
  submitLabel,
  onBack,
  onSave,
  onNext,
}: {
  saving: boolean;
  canBack: boolean;
  canNext: boolean;
  submitLabel?: string;
  onBack: () => void;
  onSave: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!canBack || saving}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save draft"}
        </Button>
      </div>
      <Button
        type="button"
        onClick={onNext}
        disabled={!canNext || saving}
        className="bg-slate-950 hover:bg-slate-800"
      >
        {saving ? "Saving..." : (submitLabel ?? "Save and continue")}
      </Button>
    </div>
  );
}
