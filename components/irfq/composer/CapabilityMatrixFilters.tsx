"use client";

import { Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { IrfqDraftPayload, IrfqReferenceData } from "@/lib/marketplace/irfq/types";

type Props = {
  payload: IrfqDraftPayload;
  referenceData: IrfqReferenceData;
  locked: boolean;
  onChange: (filters: NonNullable<IrfqDraftPayload["capabilityMatrixFilters"]>) => void;
};

export function CapabilityMatrixFilters({ payload, referenceData, locked, onChange }: Props) {
  const filters = payload.capabilityMatrixFilters ?? {};
  const machines = referenceData.machineTypes ?? [];
  const inspection = referenceData.inspectionEquipment ?? [];

  function update(patch: Partial<NonNullable<IrfqDraftPayload["capabilityMatrixFilters"]>>) {
    onChange({ ...filters, ...patch });
  }

  function toggleMachine(slug: string) {
    const current = filters.requiredMachines ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    update({ requiredMachines: next });
  }

  function toggleInspection(slug: string) {
    const current = filters.requiredInspection ?? [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    update({ requiredInspection: next });
  }

  if (locked) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Lock className="mr-1 inline h-4 w-4" />
        Upgrade to Premium to filter suppliers by machines, part size, tolerance, and inspection equipment.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Supplier Capability Matrix</h3>
        <p className="text-xs text-slate-500">Match manufacturers by equipment — not just company size.</p>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-slate-500">Available machines</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {machines.map((machine) => (
            <button
              key={machine.slug}
              type="button"
              onClick={() => toggleMachine(machine.slug)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filters.requiredMachines?.includes(machine.slug)
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              {machine.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Max part length (mm)</Label>
          <Input
            type="number"
            className="mt-1"
            value={filters.maxPartLengthMm ?? ""}
            onChange={(e) =>
              update({ maxPartLengthMm: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <Label>Max part width (mm)</Label>
          <Input
            type="number"
            className="mt-1"
            value={filters.maxPartWidthMm ?? ""}
            onChange={(e) =>
              update({ maxPartWidthMm: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <Label>Min tolerance (mm)</Label>
          <Input
            type="number"
            step="0.01"
            className="mt-1"
            value={filters.minToleranceMm ?? ""}
            onChange={(e) =>
              update({ minToleranceMm: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wide text-slate-500">Inspection equipment</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {inspection.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => toggleInspection(item.slug)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                filters.requiredInspection?.includes(item.slug)
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
