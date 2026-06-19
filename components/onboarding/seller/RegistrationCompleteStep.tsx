"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { StepProps } from "./types";

export function RegistrationCompleteStep({
  completion,
  gate,
}: {
  completion: { overallPercent: number };
  gate: { canActivate: boolean; missingRequirements: string[] };
}) {
  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-lg font-bold text-slate-950">Business account created</h3>
      <p className="mt-2 text-sm text-slate-600">
        Profile completion is {completion.overallPercent}%. Complete the remaining profile sections to increase visibility, rank higher in search, receive RFQs, and qualify for verified badges.
      </p>
      {gate.canActivate ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          All activation requirements are complete.
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <ShieldAlert className="h-4 w-4" /> Activation requirements
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
            {gate.missingRequirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
