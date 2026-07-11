"use client";

import React, { useEffect, useState } from "react";
import { useMasterData } from "./MasterDataProvider";
import { FormField, FormInput, FormSelect, RadioGroup, FormTextarea } from "./FormComponents";

export type Phase3Data = {
  weightValue: string;
  weightUnit: string;
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  dimUnit: string;
  shippingType: string;
  primaryPackaging: string;
  secondaryPackaging: string;
  packagingNotes: string;
};

export function Phase3Packaging({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase3Data>;
  onChange: (data: Partial<Phase3Data>) => void;
}) {
  const { weightUnits, dimensionUnits, shippingTypes, primaryPackaging, secondaryPackaging } = useMasterData();

  const [data, setData] = useState<Partial<Phase3Data>>({
    weightValue: "",
    weightUnit: "kg",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    dimUnit: "mm",
    shippingType: "packed",
    primaryPackaging: "",
    secondaryPackaging: "",
    packagingNotes: "",
    ...initialData,
  });

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, onChange]);

  const updateField = <K extends keyof Phase3Data>(field: K, value: Phase3Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Weight & Dimensions */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Weight & Dimensions</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-slate-900">Product Weight (Optional)</label>
            <div className="flex gap-2">
              <FormInput
                type="number"
                placeholder="0.00"
                value={data.weightValue || ""}
                onChange={(e) => updateField("weightValue", e.target.value)}
                className="w-2/3"
              />
              <FormSelect
                value={data.weightUnit || "kg"}
                onChange={(val) => updateField("weightUnit", val)}
                options={weightUnits}
                className="w-1/3"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-slate-900">Dimensions (L × W × H) (Optional)</label>
            <div className="flex gap-2">
              <FormInput
                type="number"
                placeholder="Length"
                value={data.dimLength || ""}
                onChange={(e) => updateField("dimLength", e.target.value)}
              />
              <FormInput
                type="number"
                placeholder="Width"
                value={data.dimWidth || ""}
                onChange={(e) => updateField("dimWidth", e.target.value)}
              />
              <FormInput
                type="number"
                placeholder="Height"
                value={data.dimHeight || ""}
                onChange={(e) => updateField("dimHeight", e.target.value)}
              />
              <FormSelect
                value={data.dimUnit || "mm"}
                onChange={(val) => updateField("dimUnit", val)}
                options={dimensionUnits}
                className="w-32 shrink-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Packaging Options */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Packaging Options</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Shipping Type" required className="md:col-span-2">
            <RadioGroup
              value={data.shippingType || ""}
              onChange={(val) => updateField("shippingType", val)}
              options={shippingTypes}
              columns={2}
            />
          </FormField>

          {data.shippingType === "packed" && (
            <>
              <FormField label="Primary Packaging" required>
                <FormSelect
                  value={data.primaryPackaging || ""}
                  onChange={(val) => updateField("primaryPackaging", val)}
                  options={primaryPackaging}
                  placeholder="Select primary packaging..."
                />
              </FormField>

              <FormField label="Secondary Packaging" required>
                <FormSelect
                  value={data.secondaryPackaging || ""}
                  onChange={(val) => updateField("secondaryPackaging", val)}
                  options={secondaryPackaging}
                  placeholder="Select secondary packaging..."
                />
              </FormField>

              <FormField label="Other Packaging Notes" className="md:col-span-2">
                <FormTextarea
                  placeholder="Any specific instructions for packaging..."
                  value={data.packagingNotes || ""}
                  onChange={(e) => updateField("packagingNotes", e.target.value)}
                />
              </FormField>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
