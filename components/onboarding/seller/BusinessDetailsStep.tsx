"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Field,
  MultiSelectChips,
  NativeSelect,
  TextInput,
} from "@/components/onboarding/OnboardingV3Wizard";
import {
  SELLER_TYPES,
  CAPABILITY_CATEGORIES,
  SUB_CAPABILITIES,
  MATERIAL_OPTIONS,
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
import { ProductsEditor } from "./ProductsEditor";
import { CountryMultiSelect } from "./CountryMultiSelect";
import { ImageUploadGrid } from "./ImageUploadGrid";
import { CertificationsEditor } from "./CertificationsEditor";
import { ExportExperienceEditor } from "./ExportExperienceEditor";
import { VideoUploadField } from "./VideoUploadField";
import type { StepProps, ProductRow, CertificationRow, ExportRow } from "./types";

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", !open && "-rotate-90")} />
      </button>
      {open ? <div className="border-t border-slate-200 px-5 py-5">{children}</div> : null}
    </div>
  );
}

function availableSubCapabilities(categories: string[]): string[] {
  const values = categories.flatMap((category) => SUB_CAPABILITIES[category] ?? []);
  return values.length ? values : ["General Manufacturing"];
}

export function BusinessDetailsStep({
  form,
  errors,
  images,
  video,
  onFieldChange,
  onImagesChange,
  onVideoChange,
  onVideoUrlChange,
}: StepProps) {
  const sellerTypes = Array.isArray(form.sellerTypes) ? (form.sellerTypes as string[]) : [];
  const capabilityCategories = Array.isArray(form.capabilityCategories) ? (form.capabilityCategories as string[]) : [];
  const products = Array.isArray(form.products) ? (form.products as ProductRow[]) : [];
  const certifications = Array.isArray(form.certifications) ? (form.certifications as CertificationRow[]) : [];
  const exportExperience = Array.isArray(form.exportExperience) ? (form.exportExperience as ExportRow[]) : [];
  const qualitySystems = Array.isArray(form.qualitySystems) ? (form.qualitySystems as string[]) : [];
  const countriesExportingTo = Array.isArray(form.countriesExportingTo) ? (form.countriesExportingTo as string[]) : [];
  const rdServices = Array.isArray(form.rdServices) ? (form.rdServices as string[]) : [];
  const hasRdTeam = Boolean(form.hasRdTeam);

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-slate-600">
        Complete your business profile to unlock higher visibility, verified badges, and better RFQ ranking.
      </p>

      {/* Section A: Seller Type */}
      <CollapsibleSection title="Seller Type">
        <Field label="Select all that apply" required error={errors.sellerTypes}>
          <MultiSelectChips
            options={SELLER_TYPES}
            value={sellerTypes}
            onChange={(value) => onFieldChange("sellerTypes", value)}
          />
        </Field>
      </CollapsibleSection>

      {/* Section B: Products & Capabilities */}
      <CollapsibleSection title="Products & Capabilities">
        <ProductsEditor
          rows={products}
          errors={errors}
          onChange={(value) => onFieldChange("products", value)}
        />
      </CollapsibleSection>

      {/* Section C: Capability Categories (legacy) */}
      <CollapsibleSection title="Capability Categories" defaultOpen={false}>
        <Field label="Capability categories" error={errors.capabilityCategories}>
          <MultiSelectChips
            options={CAPABILITY_CATEGORIES}
            value={capabilityCategories}
            onChange={(value) => onFieldChange("capabilityCategories", value)}
          />
        </Field>
        <div className="mt-4">
          <Field label="Materials" error={errors.materials}>
            <MultiSelectChips
              options={MATERIAL_OPTIONS}
              value={Array.isArray(form.materials) ? (form.materials as string[]) : []}
              onChange={(value) => onFieldChange("materials", value)}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* Section D: Innovation & R&D */}
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

      {/* Section E: Factory & Team */}
      <CollapsibleSection title="Factory & Team">
        <div className="grid gap-4 lg:grid-cols-2">
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
          <Field label="Countries Exporting To" error={errors.countriesExportingTo}>
            <CountryMultiSelect
              value={countriesExportingTo}
              onChange={(v) => onFieldChange("countriesExportingTo", v)}
              error={errors.countriesExportingTo}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Languages Supported" error={errors.languagesSupported}>
            <MultiSelectChips
              options={LANGUAGE_OPTIONS}
              value={Array.isArray(form.languagesSupported) ? (form.languagesSupported as string[]) : []}
              onChange={(value) => onFieldChange("languagesSupported", value)}
            />
          </Field>
          {Array.isArray(form.languagesSupported) && (form.languagesSupported as string[]).includes("Other") ? (
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

      {/* Section F: Export Experience */}
      <CollapsibleSection title="Export Experience" defaultOpen={false}>
        <ExportExperienceEditor
          rows={exportExperience}
          errors={errors}
          onChange={(value) => onFieldChange("exportExperience", value)}
        />
      </CollapsibleSection>

      {/* Section G: Factory Gallery */}
      <CollapsibleSection title="Factory Gallery" defaultOpen={false}>
        <p className="mb-4 text-xs text-slate-500">Upload photos of your factory. Buyers trust sellers with real visual evidence.</p>
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
      </CollapsibleSection>

      {/* Section I: Certifications */}
      <CollapsibleSection title="Certifications" defaultOpen={false}>
        <div className="mb-4">
          <Field label="Quick Add">
            <MultiSelectChips
              options={CERTIFICATION_PRESETS}
              value={certifications.map((c) => c.certificateName).filter((n) => CERTIFICATION_PRESETS.includes(n as typeof CERTIFICATION_PRESETS[number]))}
              onChange={(selected) => {
                const existing = certifications.filter((c) => !CERTIFICATION_PRESETS.includes(c.certificateName as typeof CERTIFICATION_PRESETS[number]));
                const newCerts = selected.map((name) => {
                  const found = certifications.find((c) => c.certificateName === name);
                  return found ?? { certificateName: name, certificateNumber: "", expiryDate: "" };
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

      {/* Section J: Quality Systems */}
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

      {/* Section K: Factory Tour */}
      <CollapsibleSection title="Factory Tour Video" defaultOpen={false}>
        <VideoUploadField
          video={video}
          videoUrl={String(form.factoryTourUrl || "")}
          onVideoChange={onVideoChange}
          onUrlChange={(url) => {
            onVideoUrlChange(url);
            if (!url && video) onVideoChange(null);
          }}
        />
      </CollapsibleSection>

      {/* Section L: Company Description */}
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
