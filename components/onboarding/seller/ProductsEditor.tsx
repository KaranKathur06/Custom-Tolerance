"use client";

import { Button } from "@/components/ui/button";
import { Field, TextInput, NativeSelect, MultiSelectChips } from "@/components/onboarding/OnboardingV3Wizard";
import { PRODUCT_CAPABILITY_OPTIONS, MATERIAL_OPTIONS, TOLERANCE_OPTIONS, LEAD_TIME_OPTIONS } from "@/lib/marketplace/onboarding-v3";
import { Plus, Trash2 } from "lucide-react";
import type { ProductRow } from "./types";

type ProductsEditorProps = {
  rows: ProductRow[];
  errors: Record<string, string>;
  onChange: (rows: ProductRow[]) => void;
};

const emptyProduct = (): ProductRow => ({
  productName: "",
  capability: "",
  materials: [],
  toleranceCapability: "",
  monthlyCapacity: "",
  moq: "",
  leadTime: "",
});

export function ProductsEditor({ rows, errors, onChange }: ProductsEditorProps) {
  const updateRow = (index: number, patch: Partial<ProductRow>) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-950">Products & Capabilities</h3>
          <p className="mt-0.5 text-xs text-slate-500">Add your key products to showcase manufacturing capabilities.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, emptyProduct()])}
          disabled={rows.length >= 10}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Product {index + 1}
              </span>
              <button
                type="button"
                className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Product Name" required error={errors[`products[${index}].productName`]}>
                <TextInput
                  value={row.productName}
                  placeholder="e.g., CNC Precision Shafts"
                  onChange={(e) => updateRow(index, { productName: e.target.value })}
                  error={Boolean(errors[`products[${index}].productName`])}
                />
              </Field>
              <Field label="Capability" error={errors[`products[${index}].capability`]}>
                <NativeSelect
                  value={row.capability}
                  onChange={(v) => updateRow(index, { capability: v })}
                  options={PRODUCT_CAPABILITY_OPTIONS}
                  placeholder="Select capability"
                />
              </Field>
            </div>

            <Field label="Materials">
              <MultiSelectChips
                options={MATERIAL_OPTIONS}
                value={row.materials}
                onChange={(v) => updateRow(index, { materials: v })}
              />
            </Field>

            <div className="grid gap-3 lg:grid-cols-4">
              <Field label="Tolerance" error={errors[`products[${index}].toleranceCapability`]}>
                <NativeSelect
                  value={row.toleranceCapability}
                  onChange={(v) => updateRow(index, { toleranceCapability: v })}
                  options={TOLERANCE_OPTIONS}
                  placeholder="Select tolerance"
                />
              </Field>
              <Field label="Monthly Capacity">
                <TextInput
                  value={row.monthlyCapacity}
                  placeholder="e.g., 1000 pcs"
                  onChange={(e) => updateRow(index, { monthlyCapacity: e.target.value })}
                />
              </Field>
              <Field label="MOQ">
                <TextInput
                  value={row.moq}
                  placeholder="e.g., 100 pcs"
                  onChange={(e) => updateRow(index, { moq: e.target.value })}
                />
              </Field>
              <Field label="Lead Time">
                {row.leadTime === "Custom" || (row.leadTime && !LEAD_TIME_OPTIONS.includes(row.leadTime as typeof LEAD_TIME_OPTIONS[number])) ? (
                  <div className="flex gap-2">
                    <NativeSelect
                      value="Custom"
                      onChange={(v) => updateRow(index, { leadTime: v })}
                      options={LEAD_TIME_OPTIONS}
                      placeholder="Select lead time"
                    />
                    <TextInput
                      value={row.leadTime === "Custom" ? "" : row.leadTime}
                      placeholder="e.g., 3-4 weeks"
                      onChange={(e) => updateRow(index, { leadTime: e.target.value })}
                    />
                  </div>
                ) : (
                  <NativeSelect
                    value={row.leadTime}
                    onChange={(v) => updateRow(index, { leadTime: v })}
                    options={LEAD_TIME_OPTIONS}
                    placeholder="Select lead time"
                  />
                )}
              </Field>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
            <p className="text-sm text-slate-500">No products added yet. Click &ldquo;Add Product&rdquo; to get started.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
