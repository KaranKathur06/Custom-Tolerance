"use client";

import React, { useState, useEffect } from "react";
import { useMasterData } from "./MasterDataProvider";
import { FormField, FormInput, FormSelect, MultiSelect, RadioGroup, ImageUploader } from "./FormComponents";

export type Phase1Data = {
  productName: string;
  images: string[];
  priceType: "fixed" | "range" | "rfq";
  minPrice: string;
  maxPrice: string;
  capabilities: string[];
  industries: string[];
  baseMaterials: string;
  grade: string;
  specification: string;
  tolerance: string;
  qualityCertificate: string;
  brandMarking: string;
  brandMarkingOther: string;
  diesAndToolsCost: string;
};

export function Phase1Technical({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase1Data>;
  onChange: (data: Partial<Phase1Data>) => void;
}) {
  const {
    capabilities,
    industries,
    tolerances,
    qualityCertificates,
    diesAndToolsCost,
    loading,
  } = useMasterData();

  const [data, setData] = useState<Partial<Phase1Data>>({
    productName: "",
    images: [],
    priceType: "rfq",
    minPrice: "",
    maxPrice: "",
    capabilities: [],
    industries: [],
    baseMaterials: "",
    grade: "",
    specification: "",
    tolerance: "",
    qualityCertificate: "",
    brandMarking: "",
    brandMarkingOther: "",
    diesAndToolsCost: "",
    ...initialData,
  });

  // Debounced onChange to trigger autosave in the parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, onChange]);

  const updateField = <K extends keyof Phase1Data>(field: K, value: Phase1Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading master data...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Basic Info */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Basic Information</h2>
        
        <FormField label="Product Name" required>
          <FormInput
            placeholder="e.g. Precision CNC Machined Aluminum Bracket"
            value={data.productName || ""}
            onChange={(e) => updateField("productName", e.target.value)}
          />
        </FormField>

        <FormField label="Product Images" description="Upload 1 to 3 images showcasing your product." required>
          <ImageUploader
            images={data.images || []}
            onChange={(images) => updateField("images", images)}
            maxImages={3}
          />
        </FormField>
      </section>

      {/* Pricing */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Pricing Model</h2>
        
        <FormField label="How do you want to price this product?" required>
          <RadioGroup
            value={data.priceType || "rfq"}
            onChange={(val) => updateField("priceType", val as any)}
            options={[
              { id: "rfq", name: "Ask for Price (RFQ)", description: "Buyers will request a quote." },
              { id: "fixed", name: "Fixed Price", description: "Set a single fixed price." },
              { id: "range", name: "Price Range", description: "Set a min and max price." },
            ]}
          />
        </FormField>

        {data.priceType === "fixed" && (
          <FormField label="Price (USD)" required>
            <FormInput
              type="number"
              placeholder="0.00"
              value={data.minPrice || ""}
              onChange={(e) => updateField("minPrice", e.target.value)}
            />
          </FormField>
        )}

        {data.priceType === "range" && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Price (USD)" required>
              <FormInput
                type="number"
                placeholder="0.00"
                value={data.minPrice || ""}
                onChange={(e) => updateField("minPrice", e.target.value)}
              />
            </FormField>
            <FormField label="Max Price (USD)" required>
              <FormInput
                type="number"
                placeholder="0.00"
                value={data.maxPrice || ""}
                onChange={(e) => updateField("maxPrice", e.target.value)}
              />
            </FormField>
          </div>
        )}
      </section>

      {/* Technical Details */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Technical Specifications</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Capabilities" description="What processes are used to make this?" required>
            <MultiSelect
              value={data.capabilities || []}
              onChange={(val) => updateField("capabilities", val)}
              options={capabilities.map(c => ({ id: c.id, name: c.name }))}
              placeholder="Select capabilities..."
            />
          </FormField>

          <FormField label="Industries" description="Which industries is this suitable for?" required>
            <MultiSelect
              value={data.industries || []}
              onChange={(val) => updateField("industries", val)}
              options={industries.map(i => ({ id: i.id, name: i.name }))}
              placeholder="Select industries..."
            />
          </FormField>

          <FormField label="Base Materials" required>
            <FormInput
              placeholder="e.g. Aluminum, Steel, Plastics"
              value={data.baseMaterials || ""}
              onChange={(e) => updateField("baseMaterials", e.target.value)}
            />
          </FormField>

          <FormField label="Grade">
            <FormInput
              placeholder="e.g. 6061-T6, 304 SS"
              value={data.grade || ""}
              onChange={(e) => updateField("grade", e.target.value)}
            />
          </FormField>

          <FormField label="Specification (Standard)">
            <FormInput
              placeholder="e.g. ASTM, DIN, ISO"
              value={data.specification || ""}
              onChange={(e) => updateField("specification", e.target.value)}
            />
          </FormField>

          <FormField label="Tolerance" required>
            <FormSelect
              value={data.tolerance || ""}
              onChange={(val) => updateField("tolerance", val)}
              options={tolerances}
            />
          </FormField>
        </div>
      </section>

      {/* Compliance & Tooling */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Compliance & Logistics</h2>

        <FormField label="Product Quality Certificate" required>
          <RadioGroup
            value={data.qualityCertificate || ""}
            onChange={(val) => updateField("qualityCertificate", val)}
            options={qualityCertificates}
          />
        </FormField>

        <FormField label="Brand Marking" required>
          <RadioGroup
            value={data.brandMarking || ""}
            onChange={(val) => updateField("brandMarking", val)}
            options={[
              { id: "custom_logo", name: "Custom Logo/Brand" },
              { id: "no_brand", name: "No Brand (White Label)" },
              { id: "other", name: "Other" },
            ]}
          />
        </FormField>
        
        {data.brandMarking === "other" && (
          <FormField label="Please specify">
            <FormInput
              placeholder="Explain brand marking details..."
              value={data.brandMarkingOther || ""}
              onChange={(e) => updateField("brandMarkingOther", e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Dies & Tools Cost" required>
          <RadioGroup
            value={data.diesAndToolsCost || ""}
            onChange={(val) => updateField("diesAndToolsCost", val)}
            options={diesAndToolsCost}
          />
        </FormField>
      </section>
    </div>
  );
}
