"use client";

import type React from "react";
import { Check, Circle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CompletionResult, OnboardingStepDefinition } from "@/lib/marketplace/onboarding-v3";

export function WizardShell({
  title,
  subtitle,
  steps,
  activeStep,
  completion,
  trustItems,
  children,
}: {
  title: string;
  subtitle: string;
  steps: OnboardingStepDefinition<string>[];
  activeStep: string;
  completion: CompletionResult;
  trustItems: Array<{ label: string; verified: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">CustomTolerance Onboarding</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Profile strength</span>
              <span>{completion.overallPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${completion.overallPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr_320px] lg:px-8">
        <StepNav steps={steps} activeStep={activeStep} completion={completion} />
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {children}
        </section>
        <aside className="space-y-4">
          <TrustPanel trustItems={trustItems} />
          <CompletionPanel completion={completion} />
        </aside>
      </main>
    </div>
  );
}

function StepNav({
  steps,
  activeStep,
  completion,
}: {
  steps: OnboardingStepDefinition<string>[];
  activeStep: string;
  completion: CompletionResult;
}) {
  return (
    <nav className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {steps.map((step, index) => {
          const section = completion.sections.find((item) => item.key === step.key);
          const complete = (section?.percent ?? 0) >= 100;
          const active = activeStep === step.key;
          return (
            <div
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-3 text-left",
                active ? "bg-blue-50 text-blue-800" : "text-slate-600",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  complete
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : active
                      ? "border-blue-200 bg-blue-100 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 hidden text-xs text-slate-500 lg:block">{step.goal}</p>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function TrustPanel({ trustItems }: { trustItems: Array<{ label: string; verified: boolean }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue-700" />
        <h2 className="text-sm font-bold text-slate-950">Trust checks</h2>
      </div>
      <div className="mt-4 space-y-2">
        {trustItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">{item.label}</span>
            <Badge
              variant={item.verified ? "success" : "outline"}
              className={item.verified ? "bg-emerald-600" : "border-slate-200 text-slate-500"}
            >
              {item.verified ? "Verified" : "Pending"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletionPanel({ completion }: { completion: CompletionResult }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-950">Completion score</h2>
      <div className="mt-4 space-y-3">
        {completion.sections.map((section) => (
          <div key={section.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{section.label}</span>
              <span className="font-semibold text-slate-900">{section.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full", section.percent >= 100 ? "bg-emerald-600" : "bg-amber-500")}
                style={{ width: `${section.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
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
}: {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(selected ? value.filter((item) => item !== option) : [...value, option])}
            className={cn(
              "min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-blue-700 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {selected ? <Check className="mr-1 inline h-3.5 w-3.5" /> : <Circle className="mr-1 inline h-3 w-3" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className={cn("border-slate-200 focus-visible:ring-blue-600", props.className)} />;
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
        <Button type="button" variant="outline" onClick={onBack} disabled={!canBack || saving}>
          Back
        </Button>
        <Button type="button" variant="outline" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save draft"}
        </Button>
      </div>
      <Button type="button" onClick={onNext} disabled={!canNext || saving} className="bg-slate-950 hover:bg-slate-800">
        {saving ? "Saving..." : submitLabel ?? "Save and continue"}
      </Button>
    </div>
  );
}
