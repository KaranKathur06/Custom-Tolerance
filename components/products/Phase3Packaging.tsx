"use client";

import React, { useState, useEffect } from "react";
import { useMasterData } from "./MasterDataProvider";
import { FormField, FormInput, RadioGroup } from "./FormComponents";

export type Phase3Data = {
  packagingOptions: string;
  quantityAvailable: string;
};

export function Phase3Packaging({
  initialData,
  onChange,
}: {
  initialData: Partial<Phase3Data>;
  onChange: (data: Partial<Phase3Data>) => void;
}) {
  const { packagingOptions: masterPackagingOptions } = useMasterData();

  const [data, setData] = useState<Partial<Phase3Data>>({
    packagingOptions: "",
    quantityAvailable: "",
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
      <section className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Packaging & Inventory</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField label="Packaging Standard" required>
            <RadioGroup
              value={data.packagingOptions || ""}
              onChange={(val) => updateField("packagingOptions", val)}
              options={masterPackagingOptions}
            />
          </FormField>

          <FormField label="Quantity Available Now (Optional)" description="If you have pre-made inventory, list the amount.">
            <FormInput
              type="number"
              placeholder="e.g. 500"
              value={data.quantityAvailable || ""}
              onChange={(e) => updateField("quantityAvailable", e.target.value)}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
