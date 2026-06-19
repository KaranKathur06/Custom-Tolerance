"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { PrivacySummary } from "@/components/onboarding/PrivacySummary";
import { buildPrivacySummary, SELLER_PRIVACY_FIELD_LABELS } from "@/lib/marketplace/profile-visibility";
import { mergePrivacyWithDefaults } from "@/lib/marketplace/profile-visibility";
import type { StepProps } from "./types";

export function RegistrationCompleteStep({
  form,
  completion,
  gate,
  onEditPrivacy,
}: {
  form?: Record<string, unknown>;
  completion: { overallPercent: number };
  gate: { canActivate: boolean; missingRequirements: string[] };
  onEditPrivacy?: () => void;
}) {
  const privacyMap = mergePrivacyWithDefaults("seller", {
    mobile: (form?.mobileVisibility as "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE") ?? "PRIVATE",
    email: (form?.emailVisibility as "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE") ?? "MEMBERS_ONLY",
    factoryAddress: (form?.factoryAddressVisibility as "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE") ?? "MEMBERS_ONLY",
    whatsapp: (form?.whatsappVisibility as "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE") ?? "PRIVATE",
    gst: (form?.gstVisibility as "PUBLIC" | "MEMBERS_ONLY" | "PRIVATE") ?? "PUBLIC",
    pan: "PRIVATE",
  });

  const summary = buildPrivacySummary(privacyMap, SELLER_PRIVACY_FIELD_LABELS);

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
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

      <PrivacySummary summary={summary} onEditPrivacy={onEditPrivacy} />
    </div>
  );
}
