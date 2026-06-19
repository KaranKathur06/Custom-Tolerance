"use client";

import { Field, MultiSelectChips, NativeSelect, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import {
  CAPABILITY_CATEGORIES,
  MATERIAL_OPTIONS,
  SELLER_TYPES,
  SUB_CAPABILITIES,
  LANGUAGE_OPTIONS,
} from "@/lib/marketplace/onboarding-v3";
import type { StepProps } from "./types";

function availableSubCapabilities(categories: string[]): string[] {
  const values = categories.flatMap((category) => SUB_CAPABILITIES[category] ?? []);
  return values.length ? values : ["General Manufacturing"];
}

function findSubCapabilityCategory(name: string): string {
  for (const [category, options] of Object.entries(SUB_CAPABILITIES)) {
    if (options.includes(name)) return category;
  }
  return "General";
}

export function BusinessDetailsStep({ form, errors, onFieldChange }: StepProps) {
  const subCapabilities = Array.isArray(form.subCapabilities) ? (form.subCapabilities as { name: string }[]) : [];
  const capabilityCategories = Array.isArray(form.capabilityCategories) ? (form.capabilityCategories as string[]) : [];
  const countriesExportingTo = Array.isArray(form.countriesExportingTo)
    ? (form.countriesExportingTo as string[])
    : String(form.countriesExportingTo || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <Field label="Seller type" required error={errors.sellerType}>
        <NativeSelect
          value={String(form.sellerType || "")}
          onChange={(value) => onFieldChange("sellerType", value)}
          options={SELLER_TYPES}
          error={Boolean(errors.sellerType)}
        />
      </Field>
      <Field label="Main industry" required error={errors.mainIndustry}>
        <TextInput
          value={String(form.mainIndustry || "")}
          onChange={(e) => onFieldChange("mainIndustry", e.target.value)}
          error={Boolean(errors.mainIndustry)}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Capability categories" required error={errors.capabilityCategories}>
          <MultiSelectChips
            options={CAPABILITY_CATEGORIES}
            value={capabilityCategories}
            onChange={(value) => onFieldChange("capabilityCategories", value)}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Sub capabilities" required error={errors.subCapabilities}>
          <MultiSelectChips
            options={availableSubCapabilities(capabilityCategories)}
            value={subCapabilities.map((item) => item.name)}
            onChange={(value) =>
              onFieldChange(
                "subCapabilities",
                value.map((name) => ({ categoryName: findSubCapabilityCategory(name), name })),
              )
            }
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Materials" required error={errors.materials}>
          <MultiSelectChips
            options={MATERIAL_OPTIONS}
            value={Array.isArray(form.materials) ? (form.materials as string[]) : []}
            onChange={(value) => onFieldChange("materials", value)}
          />
        </Field>
      </div>
      <Field label="Monthly capacity" required error={errors.monthlyCapacity}>
        <TextInput
          value={String(form.monthlyCapacity || "")}
          onChange={(e) => onFieldChange("monthlyCapacity", e.target.value)}
          error={Boolean(errors.monthlyCapacity)}
        />
      </Field>
      <Field label="MOQ" required error={errors.moq}>
        <TextInput
          value={String(form.moq || "")}
          onChange={(e) => onFieldChange("moq", e.target.value)}
          error={Boolean(errors.moq)}
        />
      </Field>
      <Field label="Lead time" required error={errors.leadTime}>
        <TextInput
          value={String(form.leadTime || "")}
          onChange={(e) => onFieldChange("leadTime", e.target.value)}
          error={Boolean(errors.leadTime)}
        />
      </Field>
      <Field label="Factory area" required error={errors.factoryArea}>
        <TextInput
          value={String(form.factoryArea || "")}
          onChange={(e) => onFieldChange("factoryArea", e.target.value)}
          error={Boolean(errors.factoryArea)}
        />
      </Field>
      <Field label="Shop floor employees" required error={errors.shopFloorEmployees}>
        <TextInput
          value={String(form.shopFloorEmployees || "")}
          onChange={(e) => onFieldChange("shopFloorEmployees", e.target.value)}
          error={Boolean(errors.shopFloorEmployees)}
        />
      </Field>
      <Field label="Engineers" required error={errors.engineers}>
        <TextInput
          value={String(form.engineers || "")}
          onChange={(e) => onFieldChange("engineers", e.target.value)}
          error={Boolean(errors.engineers)}
        />
      </Field>
      <Field label="QC team size" required error={errors.qcTeamSize}>
        <TextInput
          value={String(form.qcTeamSize || "")}
          onChange={(e) => onFieldChange("qcTeamSize", e.target.value)}
          error={Boolean(errors.qcTeamSize)}
        />
      </Field>
      <Field label="Countries exporting to" error={errors.countriesExportingTo}>
        <TextInput
          value={countriesExportingTo.join(", ")}
          onChange={(e) =>
            onFieldChange(
              "countriesExportingTo",
              e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
            )
          }
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Languages supported" error={errors.languagesSupported}>
          <MultiSelectChips
            options={LANGUAGE_OPTIONS}
            value={Array.isArray(form.languagesSupported) ? (form.languagesSupported as string[]) : []}
            onChange={(value) => onFieldChange("languagesSupported", value)}
          />
        </Field>
      </div>
    </div>
  );
}
