"use client";

import React, { useEffect, useState } from "react";
import { useMasterData } from "./MasterDataProvider";
import {
  FormField,
  FormInput,
  FormSelect,
  RadioGroup,
  ImageUploader,
  GroupedMultiSelect,
  TagInput,
  UploadedImage,
} from "./FormComponents";

export type Phase1Data = {
  productName: string;
  images: UploadedImage[];
  priceType: "ask_for_price" | "fixed_price" | "price_range";
  minPrice: string;
  maxPrice: string;
  currency: string;
  priceUnit: string;
  capabilities: string[];
  industries: string[];
  materials: string[];
  grades: string[];
  specification: string;
  tolerance: string;
  qualityCertificate: string;
  brandMarking: string;
  brandMarkingOther: string;
  diesAndTools: string;
  estimatedToolCost: string;
  toolOwnership: string;
  toolLeadTime: string;
};

export function Phase1Technical({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase1Data>;
  onChange: (data: Partial<Phase1Data>) => void;
}) {
  const {
    capabilityGroups,
    industryGroups,
    currencies,
    priceUnits,
    tolerances,
    qualityCertificates,
    brandMarkingOptions,
    diesAndToolsCost,
    leadTimes,
    loading,
  } = useMasterData();

  const [data, setData] = useState<Partial<Phase1Data>>({
    productName: "",
    images: [],
    priceType: "ask_for_price",
    minPrice: "",
    maxPrice: "",
    currency: "USD",
    priceUnit: "per_piece",
    capabilities: [],
    industries: [],
    materials: [],
    grades: [],
    specification: "",
    tolerance: "",
    qualityCertificate: "",
    brandMarking: "",
    brandMarkingOther: "",
    diesAndTools: "",
    estimatedToolCost: "",
    toolOwnership: "",
    toolLeadTime: "",
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
            value={data.priceType || "ask_for_price"}
            onChange={(val) => updateField("priceType", val as any)}
            options={[
              { id: "ask_for_price", name: "Ask For Price", description: "Redirect buyer to RFQ." },
              { id: "fixed_price", name: "Fixed Price", description: "Single unit price." },
              { id: "price_range", name: "Price Range", description: "Minimum and maximum price." },
            ]}
          />
        </FormField>

        {data.priceType !== "ask_for_price" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField label="Currency" required>
              <FormSelect
                value={data.currency || "USD"}
                onChange={(val) => updateField("currency", val)}
                options={currencies}
              />
            </FormField>
            
            <FormField label="Unit" required>
              <FormSelect
                value={data.priceUnit || "per_piece"}
                onChange={(val) => updateField("priceUnit", val)}
                options={priceUnits}
              />
            </FormField>

            {data.priceType === "fixed_price" && (
              <FormField label="Price" required>
                <FormInput
                  type="number"
                  placeholder="0.00"
                  value={data.minPrice || ""}
                  onChange={(e) => updateField("minPrice", e.target.value)}
                />
              </FormField>
            )}

            {data.priceType === "price_range" && (
              <>
                <FormField label="Minimum Price" required>
                  <FormInput
                    type="number"
                    placeholder="0.00"
                    value={data.minPrice || ""}
                    onChange={(e) => updateField("minPrice", e.target.value)}
                  />
                </FormField>
                <FormField label="Maximum Price" required>
                  <FormInput
                    type="number"
                    placeholder="0.00"
                    value={data.maxPrice || ""}
                    onChange={(e) => updateField("maxPrice", e.target.value)}
                  />
                </FormField>
              </>
            )}
          </div>
        )}
      </section>

      {/* Technical Details */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Technical Specifications</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Product Capabilities" description="What processes are used to make this?" required className="md:col-span-2">
            <GroupedMultiSelect
              value={data.capabilities || []}
              onChange={(val) => updateField("capabilities", val)}
              groups={capabilityGroups}
              placeholder="Select capabilities..."
            />
          </FormField>

          <FormField label="Industries" description="Which industries is this suitable for?" required className="md:col-span-2">
            <GroupedMultiSelect
              value={data.industries || []}
              onChange={(val) => updateField("industries", val)}
              groups={industryGroups}
              placeholder="Select industries..."
            />
          </FormField>

          <FormField label="Materials" required>
            <TagInput
              value={data.materials || []}
              onChange={(val) => updateField("materials", val)}
              placeholder="e.g. Aluminium, SS304"
            />
          </FormField>

          <FormField label="Grades">
            <TagInput
              value={data.grades || []}
              onChange={(val) => updateField("grades", val)}
              placeholder="e.g. 6061-T6, EN8"
            />
          </FormField>

          <FormField label="Specification (Standard)">
            <FormInput
              placeholder="e.g. ASTM, DIN, ISO, Customer Drawing"
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
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Compliance & Tooling</h2>

        <FormField label="Product Quality Certificate" required>
          <RadioGroup
            value={data.qualityCertificate || ""}
            onChange={(val) => updateField("qualityCertificate", val)}
            options={qualityCertificates}
            columns={3}
          />
        </FormField>

        <FormField label="Brand Marking" required>
          <RadioGroup
            value={data.brandMarking || ""}
            onChange={(val) => updateField("brandMarking", val)}
            options={brandMarkingOptions}
            columns={2}
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

        <FormField label="Dies & Tooling" required>
          <RadioGroup
            value={data.diesAndTools || ""}
            onChange={(val) => updateField("diesAndTools", val)}
            options={diesAndToolsCost}
          />
        </FormField>

        {data.diesAndTools === "required" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-2">
            <FormField label="Estimated Tool Cost" required>
              <FormInput
                type="number"
                placeholder="e.g. 5000"
                value={data.estimatedToolCost || ""}
                onChange={(e) => updateField("estimatedToolCost", e.target.value)}
              />
            </FormField>
            
            <FormField label="Tool Ownership" required>
              <FormSelect
                value={data.toolOwnership || ""}
                onChange={(val) => updateField("toolOwnership", val)}
                options={[
                  { id: "buyer", name: "Buyer Owned" },
                  { id: "supplier", name: "Supplier Owned" },
                  { id: "shared", name: "Shared Ownership" }
                ]}
              />
            </FormField>

            <FormField label="Tool Lead Time" required>
              <FormSelect
                value={data.toolLeadTime || ""}
                onChange={(val) => updateField("toolLeadTime", val)}
                options={leadTimes}
              />
            </FormField>
          </div>
        )}
      </section>
    </div>
  );
}
