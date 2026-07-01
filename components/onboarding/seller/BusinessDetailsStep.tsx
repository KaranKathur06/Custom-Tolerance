"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Field,
  MultiSelectChips,
  NativeSelect,
  TextInput,
} from "@/components/onboarding/OnboardingV3Wizard";
import {
  SELLER_TYPES,
  INDUSTRIES_SERVED_OPTIONS,
  CAPABILITIES_OPTIONS,
  BUYER_SERVICES_OPTIONS,
  SUPPLIER_INTERESTS_OPTIONS,
  YEARS_IN_BUSINESS_OPTIONS,
  LANGUAGE_OPTIONS,
  QUALITY_SYSTEM_OPTIONS,
  FACTORY_AREA_OPTIONS,
  FACTORY_AREA_UNITS,
  TOTAL_EMPLOYEES_OPTIONS,
  ENGINEERS_OPTIONS,
  QC_TEAM_OPTIONS,
  RD_TEAM_SIZE_OPTIONS,
  RD_SERVICE_OPTIONS,
  FACTORY_PHOTO_CATEGORIES,
  FACTORY_PHOTO_LIMITS,
  CERTIFICATION_PRESETS,
} from "@/lib/marketplace/onboarding-v3";
import { ImageUploadGrid } from "./ImageUploadGrid";
import { CertificationsEditor } from "./CertificationsEditor";
import { FactoryVideoUrlsField } from "./FactoryVideoUrlsField";
import type { StepProps, CertificationRow } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
          {badge ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {badge}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open ? <div className="border-t border-slate-200 px-5 py-5">{children}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Searchable multi-select chips (for Industries & Capabilities)
// ─────────────────────────────────────────────────────────────────────────────

function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  error,
}: {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase().trim()))
    : options;

  const toggle = (option: string) => {
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option]
    );
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border bg-white py-2 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
              : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
          )}
        />
      </div>

      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {v}
              <span className="text-blue-200">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Options grid */}
      <div className="flex flex-wrap gap-1.5">
        {filtered
          .filter((o) => !value.includes(o))
          .map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              {option}
            </button>
          ))}
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400">No results for &quot;{query}&quot;</p>
        ) : null}
      </div>

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function BusinessDetailsStep({
  form,
  errors,
  images,
  onFieldChange,
  onImagesChange,
}: StepProps) {
  const sellerTypes = Array.isArray(form.sellerTypes) ? (form.sellerTypes as string[]) : [];
  const industriesServed = Array.isArray(form.industriesServed)
    ? (form.industriesServed as string[])
    : [];
  const capabilities = Array.isArray(form.capabilities) ? (form.capabilities as string[]) : [];
  const buyerServices = Array.isArray(form.buyerServices) ? (form.buyerServices as string[]) : [];
  const supplierInterests = Array.isArray(form.supplierInterests)
    ? (form.supplierInterests as string[])
    : [];
  const certifications = Array.isArray(form.certifications)
    ? (form.certifications as CertificationRow[])
    : [];
  const qualitySystems = Array.isArray(form.qualitySystems)
    ? (form.qualitySystems as string[])
    : [];
  const rdServices = Array.isArray(form.rdServices) ? (form.rdServices as string[]) : [];
  const videoUrls = Array.isArray(form.videoUrls) ? (form.videoUrls as string[]) : [];
  const hasRdTeam = Boolean(form.hasRdTeam);

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-slate-600">
        Complete your business profile to unlock higher visibility, verified badges, and better RFQ
        matching.
      </p>

      {/* ─── Section A: Seller Type ─── */}
      <CollapsibleSection title="Seller Type" badge={sellerTypes.length ? `${sellerTypes.length} selected` : undefined}>
        <Field label="Select all that apply" required error={errors.sellerTypes}>
          <MultiSelectChips
            options={SELLER_TYPES}
            value={sellerTypes}
            onChange={(value) => onFieldChange("sellerTypes", value)}
          />
        </Field>
        {/* Other text box */}
        {sellerTypes.includes("Other") ? (
          <div className="mt-3">
            <Field label="Please specify your seller type" error={errors.sellerTypeOther}>
              <TextInput
                value={String(form.sellerTypeOther || "")}
                onChange={(e) => onFieldChange("sellerTypeOther", e.target.value)}
                placeholder="e.g. Toll Manufacturer, Subcontract Machinist..."
              />
            </Field>
          </div>
        ) : null}
      </CollapsibleSection>

      {/* ─── Section B: Industries Served ─── */}
      <CollapsibleSection
        title="Industries Served"
        badge={industriesServed.length ? `${industriesServed.length} selected` : undefined}
      >
        <p className="mb-3 text-xs text-slate-500">
          Which industries do your customers operate in? This powers supplier discovery and RFQ
          matching.
        </p>
        <SearchableMultiSelect
          options={INDUSTRIES_SERVED_OPTIONS}
          value={industriesServed}
          onChange={(value) => onFieldChange("industriesServed", value)}
          placeholder="Search industries..."
          error={errors.industriesServed}
        />
      </CollapsibleSection>

      {/* ─── Section C: Capabilities ─── */}
      <CollapsibleSection
        title="Capabilities"
        badge={capabilities.length ? `${capabilities.length} selected` : undefined}
      >
        <p className="mb-3 text-xs text-slate-500">
          What manufacturing processes can you perform? This is your most important search signal.
        </p>
        <SearchableMultiSelect
          options={CAPABILITIES_OPTIONS}
          value={capabilities}
          onChange={(value) => onFieldChange("capabilities", value)}
          placeholder="Search capabilities (e.g. CNC Milling, Forging)..."
          error={errors.capabilities}
        />
      </CollapsibleSection>

      {/* ─── Section D: Buyer Services Available ─── */}
      <CollapsibleSection
        title="Buyer Services Available"
        badge={buyerServices.length ? `${buyerServices.length} selected` : undefined}
        defaultOpen={false}
      >
        <p className="mb-3 text-xs text-slate-500">
          Tell buyers how you&apos;re willing to work. These become RFQ matching filters.
        </p>
        <Field label="Select all that apply" error={errors.buyerServices}>
          <MultiSelectChips
            options={BUYER_SERVICES_OPTIONS}
            value={buyerServices}
            onChange={(value) => onFieldChange("buyerServices", value)}
          />
        </Field>
      </CollapsibleSection>

      {/* ─── Section E: Innovation & R&D ─── */}
      <CollapsibleSection title="Innovation & R&D" defaultOpen={false}>
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 transition-colors">
          <input
            type="checkbox"
            checked={hasRdTeam}
            onChange={(e) => onFieldChange("hasRdTeam", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          We have an R&D team
        </label>
        {hasRdTeam ? (
          <div className="mt-4 space-y-4">
            <Field label="R&D Team Size">
              <NativeSelect
                value={String(form.rdTeamSize || "")}
                onChange={(v) => onFieldChange("rdTeamSize", v)}
                options={RD_TEAM_SIZE_OPTIONS}
                placeholder="Select team size"
              />
            </Field>
            <Field label="R&D Services">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {RD_SERVICE_OPTIONS.map((service) => (
                  <label
                    key={service}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                      rdServices.includes(service)
                        ? "border-blue-500 bg-blue-50 font-semibold text-blue-800"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={rdServices.includes(service)}
                      onChange={() => {
                        const next = rdServices.includes(service)
                          ? rdServices.filter((s) => s !== service)
                          : [...rdServices, service];
                        onFieldChange("rdServices", next);
                      }}
                      className="sr-only"
                    />
                    {service}
                  </label>
                ))}
              </div>
            </Field>
            {rdServices.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold text-violet-800">
                Innovation Ready Supplier
              </div>
            ) : null}
          </div>
        ) : null}
      </CollapsibleSection>

      {/* ─── Section F: Factory & Team ─── */}
      <CollapsibleSection title="Factory & Team">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Years in Business — moved from removed Export Experience section */}
          <Field label="Years in Business" error={errors.yearsInBusiness}>
            <NativeSelect
              value={String(form.yearsInBusiness || "")}
              onChange={(v) => onFieldChange("yearsInBusiness", v)}
              options={YEARS_IN_BUSINESS_OPTIONS}
              placeholder="Select years"
            />
          </Field>

          {/* Factory Area */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Factory Area" error={errors.factoryArea}>
                <NativeSelect
                  value={String(form.factoryArea || "")}
                  onChange={(v) => onFieldChange("factoryArea", v)}
                  options={FACTORY_AREA_OPTIONS}
                  placeholder="Select area"
                />
              </Field>
            </div>
            <div className="w-24">
              <Field label="Unit">
                <NativeSelect
                  value={String(form.factoryAreaUnit || "sq.m")}
                  onChange={(v) => onFieldChange("factoryAreaUnit", v)}
                  options={FACTORY_AREA_UNITS}
                />
              </Field>
            </div>
          </div>

          <Field label="Total Employees" error={errors.totalEmployees}>
            <NativeSelect
              value={String(form.totalEmployees || "")}
              onChange={(v) => onFieldChange("totalEmployees", v)}
              options={TOTAL_EMPLOYEES_OPTIONS}
              placeholder="Select range"
            />
          </Field>
          <Field label="Engineers" error={errors.engineers}>
            <NativeSelect
              value={String(form.engineers || "")}
              onChange={(v) => onFieldChange("engineers", v)}
              options={ENGINEERS_OPTIONS}
              placeholder="Select range"
            />
          </Field>
          <Field label="Quality Control Team" error={errors.qcTeamSize}>
            <NativeSelect
              value={String(form.qcTeamSize || "")}
              onChange={(v) => onFieldChange("qcTeamSize", v)}
              options={QC_TEAM_OPTIONS}
              placeholder="Select range"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Languages Supported" error={errors.languagesSupported}>
            <MultiSelectChips
              options={LANGUAGE_OPTIONS}
              value={
                Array.isArray(form.languagesSupported) ? (form.languagesSupported as string[]) : []
              }
              onChange={(value) => onFieldChange("languagesSupported", value)}
            />
          </Field>
          {Array.isArray(form.languagesSupported) &&
          (form.languagesSupported as string[]).includes("Other") ? (
            <div className="mt-2">
              <TextInput
                value={String(form.otherLanguage || "")}
                onChange={(e) => onFieldChange("otherLanguage", e.target.value)}
                placeholder="Specify other language"
              />
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* ─── Section G: Factory Gallery ─── */}
      <CollapsibleSection title="Factory Gallery" defaultOpen={false}>
        <p className="mb-4 text-xs text-slate-500">
          Upload photos of your factory. Buyers trust sellers with real visual evidence.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FACTORY_PHOTO_CATEGORIES.map((category) => {
            const limits = FACTORY_PHOTO_LIMITS[category];
            return (
              <ImageUploadGrid
                key={category}
                category={category}
                label={`${category} Photos`}
                required={limits ? limits.min > 0 : false}
                images={images[category] || []}
                min={limits?.min ?? 0}
                max={limits?.max ?? 10}
                error={errors[`factoryPhotos_${category}`] || errors.factoryPhotos}
                onChange={(value) => onImagesChange(category, value)}
              />
            );
          })}
        </div>

        {/* Video URLs — replaces file upload */}
        <div className="mt-5 border-t border-slate-200 pt-5">
          <FactoryVideoUrlsField
            urls={videoUrls}
            onChange={(urls) => onFieldChange("videoUrls", urls)}
            error={errors.videoUrls}
          />
        </div>
      </CollapsibleSection>

      {/* ─── Section H: Certifications ─── */}
      <CollapsibleSection
        title="Certifications"
        badge={certifications.length ? `${certifications.length}` : undefined}
        defaultOpen={false}
      >
        <div className="mb-4">
          <Field label="Quick Add">
            <MultiSelectChips
              options={CERTIFICATION_PRESETS}
              value={certifications
                .map((c) => c.certificateName)
                .filter((n) =>
                  CERTIFICATION_PRESETS.includes(n as (typeof CERTIFICATION_PRESETS)[number])
                )}
              onChange={(selected) => {
                const existing = certifications.filter(
                  (c) =>
                    !CERTIFICATION_PRESETS.includes(
                      c.certificateName as (typeof CERTIFICATION_PRESETS)[number]
                    )
                );
                const newCerts = selected.map((name) => {
                  const found = certifications.find((c) => c.certificateName === name);
                  return found ?? { certificateName: name };
                });
                onFieldChange("certifications", [...existing, ...newCerts]);
              }}
            />
          </Field>
        </div>
        <CertificationsEditor
          rows={certifications}
          errors={errors}
          onChange={(value) => onFieldChange("certifications", value)}
        />
      </CollapsibleSection>

      {/* ─── Section I: Supplier Interests ─── */}
      <CollapsibleSection
        title="Supplier Interests"
        badge={supplierInterests.length ? `${supplierInterests.length} selected` : undefined}
        defaultOpen={false}
      >
        <p className="mb-3 text-xs text-slate-500">
          What kind of business relationships are you looking for? Powers buyer-supplier matching and
          AI recommendations.
        </p>
        <Field label="Select all that apply" error={errors.supplierInterests}>
          <MultiSelectChips
            options={SUPPLIER_INTERESTS_OPTIONS}
            value={supplierInterests}
            onChange={(value) => onFieldChange("supplierInterests", value)}
          />
        </Field>
      </CollapsibleSection>

      {/* ─── Section J: Quality Systems ─── */}
      <CollapsibleSection title="Quality Systems" defaultOpen={false}>
        <Field label="Quality systems implemented">
          <MultiSelectChips
            options={QUALITY_SYSTEM_OPTIONS}
            value={qualitySystems}
            onChange={(value) => onFieldChange("qualitySystems", value)}
          />
        </Field>
        {qualitySystems.includes("Other") ? (
          <div className="mt-2">
            <TextInput
              value={String(form.otherQualitySystem || "")}
              onChange={(e) => onFieldChange("otherQualitySystem", e.target.value)}
              placeholder="Specify other quality system"
            />
          </div>
        ) : null}
      </CollapsibleSection>

      {/* ─── Section K: Company Description ─── */}
      <CollapsibleSection title="Company Description" defaultOpen={false}>
        <Field label="Company description" error={errors.companyDescription}>
          <Textarea
            value={String(form.companyDescription || "")}
            onChange={(e) => onFieldChange("companyDescription", e.target.value)}
            rows={4}
            placeholder="Describe your company, its history, mission, and key strengths..."
            className={errors.companyDescription ? "border-red-300" : ""}
          />
        </Field>
      </CollapsibleSection>
    </div>
  );
}
