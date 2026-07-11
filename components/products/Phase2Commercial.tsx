"use client";

import React, { useEffect, useState } from "react";
import { useMasterData } from "./MasterDataProvider";
import { FormField, FormInput, FormSelect, RadioGroup, FormTextarea, MultiSelect } from "./FormComponents";

export type Phase2Data = {
  moq: string;
  productionCapacity: string;
  productionCapacityUnit: string;
  leadTime: string;
  description: string;
  countryOfOrigin: string;
  freeSample: string;
  sampleShippingCost: string;
  thirdPartyInspection: string;
  paymentTerms: string[];
  incoterms: string[];
  deliveryTerms: string;
};

export function Phase2Commercial({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase2Data>;
  onChange: (data: Partial<Phase2Data>) => void;
}) {
  const { units, leadTimes, countries, paymentTerms, incoterms } = useMasterData();

  const [data, setData] = useState<Partial<Phase2Data>>({
    moq: "",
    productionCapacity: "",
    productionCapacityUnit: "pcs",
    leadTime: "",
    description: "",
    countryOfOrigin: "",
    freeSample: "",
    sampleShippingCost: "",
    thirdPartyInspection: "",
    paymentTerms: [],
    incoterms: [],
    deliveryTerms: "",
    ...initialData,
  });

  // Debounced onChange to trigger autosave in the parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, onChange]);

  const updateField = <K extends keyof Phase2Data>(field: K, value: Phase2Data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Description */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Product Description</h2>
        
        <FormField label="Description" required>
          <FormTextarea
            placeholder="Provide a detailed description of the product, including key features, applications, and any other relevant information."
            value={data.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </FormField>
      </section>

      {/* Production & Minimums */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Production & Minimums</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Minimum Order Quantity (MOQ)" required>
            <FormInput
              type="number"
              placeholder="e.g. 100"
              value={data.moq || ""}
              onChange={(e) => updateField("moq", e.target.value)}
            />
          </FormField>

          <FormField label="Standard Lead Time" required>
            <FormSelect
              value={data.leadTime || ""}
              onChange={(val) => updateField("leadTime", val)}
              options={leadTimes}
              placeholder="Select lead time..."
            />
          </FormField>
          
          <FormField label="Monthly Production Capacity" required>
            <FormInput
              type="number"
              placeholder="e.g. 50000"
              value={data.productionCapacity || ""}
              onChange={(e) => updateField("productionCapacity", e.target.value)}
            />
          </FormField>
          
          <FormField label="Capacity Unit" required>
            <FormSelect
              value={data.productionCapacityUnit || "pcs"}
              onChange={(val) => updateField("productionCapacityUnit", val)}
              options={units}
            />
          </FormField>
        </div>
      </section>

      {/* Commercial Terms */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Commercial Terms</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Country Of Origin" required>
            <FormSelect
              value={data.countryOfOrigin || ""}
              onChange={(val) => updateField("countryOfOrigin", val)}
              options={countries}
              placeholder="Select country..."
            />
          </FormField>

          <FormField label="Third Party Inspection" required>
            <RadioGroup
              value={data.thirdPartyInspection || ""}
              onChange={(val) => updateField("thirdPartyInspection", val)}
              options={[
                { id: "yes", name: "Yes" },
                { id: "no", name: "No" },
              ]}
              columns={2}
            />
          </FormField>

          <FormField label="Free Sample" required>
            <RadioGroup
              value={data.freeSample || ""}
              onChange={(val) => updateField("freeSample", val)}
              options={[
                { id: "yes", name: "Yes" },
                { id: "no", name: "No" },
              ]}
              columns={2}
            />
          </FormField>

          {data.freeSample === "yes" && (
            <FormField label="Sample Shipping Cost Borne By" required>
              <RadioGroup
                value={data.sampleShippingCost || ""}
                onChange={(val) => updateField("sampleShippingCost", val)}
                options={[
                  { id: "supplier", name: "Supplier" },
                  { id: "buyer", name: "Buyer" },
                ]}
                columns={2}
              />
            </FormField>
          )}

          <FormField label="Payment Terms" required className="md:col-span-2">
            <MultiSelect
              value={data.paymentTerms || []}
              onChange={(val) => updateField("paymentTerms", val)}
              options={paymentTerms}
              placeholder="Select accepted payment terms..."
            />
          </FormField>

          <FormField label="Incoterms" required className="md:col-span-2">
            <MultiSelect
              value={data.incoterms || []}
              onChange={(val) => updateField("incoterms", val)}
              options={incoterms}
              placeholder="Select supported incoterms..."
            />
          </FormField>

          <FormField label="Additional Delivery Terms" className="md:col-span-2">
            <FormTextarea
              placeholder="Any other terms or conditions regarding delivery..."
              value={data.deliveryTerms || ""}
              onChange={(e) => updateField("deliveryTerms", e.target.value)}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
