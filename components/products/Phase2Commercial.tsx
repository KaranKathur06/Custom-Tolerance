"use client";

import React, { useState, useEffect } from "react";
import { useMasterData } from "./MasterDataProvider";
import { FormField, FormInput, FormSelect, MultiSelect, RadioGroup } from "./FormComponents";

export type Phase2Data = {
  moq: string;
  productionCapacity: string;
  productionCapacityUnit: string;
  leadTime: string;
  customTolerance: string;
  certifications: string[];
};

export function Phase2Commercial({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase2Data>;
  onChange: (data: Partial<Phase2Data>) => void;
}) {
  const { units, leadTimes } = useMasterData();

  const [data, setData] = useState<Partial<Phase2Data>>({
    moq: "",
    productionCapacity: "",
    productionCapacityUnit: "pcs",
    leadTime: "",
    customTolerance: "no",
    certifications: [],
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

      {/* Certifications & Quality */}
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Certifications & Quality</h2>
        
        <FormField label="Company/Product Certifications" description="Select all ISO or industry certifications that apply to this product.">
          <MultiSelect
            value={data.certifications || []}
            onChange={(val) => updateField("certifications", val)}
            options={[
              { id: "iso_9001", name: "ISO 9001" },
              { id: "iso_14001", name: "ISO 14001" },
              { id: "ts_16949", name: "TS 16949" },
              { id: "as_9100", name: "AS 9100" },
              { id: "rohs", name: "RoHS Compliant" },
            ]}
            placeholder="Select certifications..."
          />
        </FormField>
        
        <FormField label="Can you accommodate Custom Tolerances?" required>
          <RadioGroup
            value={data.customTolerance || "no"}
            onChange={(val) => updateField("customTolerance", val)}
            options={[
              { id: "yes", name: "Yes, we accept custom tolerance requirements" },
              { id: "no", name: "No, standard tolerances only" },
            ]}
          />
        </FormField>
      </section>
    </div>
  );
}
