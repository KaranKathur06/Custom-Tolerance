"use client";

import { useState } from "react";
import { Building2, Check, Loader2, MessageSquareWarning, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SUPPLIER_ONBOARDING_STATUS_LABELS,
  getOnboardingStatusTone,
  type SupplierOnboardingStatus,
} from "@/lib/marketplace/supplier-onboarding-status";

export type SupplierReviewCard = {
  id: string;
  companyName: string;
  completionPercent: number;
  onboardingStatus: SupplierOnboardingStatus;
  trustScore: number;
  registrationDate: string;
  gstNumber?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  supplierHref?: string;
};

type SupplierReviewQueueProps = {
  suppliers: SupplierReviewCard[];
  onAction: (id: string, action: "approve" | "reject" | "request_changes" | "suspend", notes?: string) => Promise<void>;
  actingId?: string | null;
};

export function SupplierReviewQueue({ suppliers, onAction, actingId }: SupplierReviewQueueProps) {
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  if (!suppliers.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-slate-500">
        No suppliers pending review.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {suppliers.map((supplier) => {
        const tone = getOnboardingStatusTone(supplier.onboardingStatus);
        const toneClass =
          tone === "success"
            ? "bg-emerald-100 text-emerald-800"
            : tone === "danger"
              ? "bg-red-100 text-red-800"
              : tone === "warning"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-800";

        return (
          <Card key={supplier.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{supplier.companyName}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {supplier.contactName ?? supplier.contactEmail ?? "No contact"}
                    </p>
                  </div>
                </div>
                <Badge className={toneClass}>
                  {SUPPLIER_ONBOARDING_STATUS_LABELS[supplier.onboardingStatus]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-semibold">{supplier.completionPercent}%</div>
                  <div className="text-xs text-slate-500">Completion</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-semibold">{supplier.trustScore}</div>
                  <div className="text-xs text-slate-500">Trust Score</div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <div className="font-semibold text-xs">
                    {new Date(supplier.registrationDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-500">Registered</div>
                </div>
              </div>

              {supplier.gstNumber ? (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">GST:</span> {supplier.gstNumber}
                </p>
              ) : null}

              {notesFor === supplier.id ? (
                <textarea
                  className="w-full rounded-md border border-slate-200 p-2 text-sm"
                  rows={3}
                  placeholder="Review notes (required for change requests)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={actingId === supplier.id}
                  onClick={() => void onAction(supplier.id, "approve")}
                >
                  {actingId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actingId === supplier.id}
                  onClick={() => {
                    if (notesFor === supplier.id && notes.trim()) {
                      void onAction(supplier.id, "request_changes", notes);
                      setNotesFor(null);
                      setNotes("");
                    } else {
                      setNotesFor(supplier.id);
                    }
                  }}
                >
                  <MessageSquareWarning className="mr-1 h-4 w-4" />
                  Request Changes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actingId === supplier.id}
                  onClick={() => void onAction(supplier.id, "reject")}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actingId === supplier.id}
                  onClick={() => void onAction(supplier.id, "suspend")}
                >
                  <Shield className="mr-1 h-4 w-4" />
                  Suspend
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
