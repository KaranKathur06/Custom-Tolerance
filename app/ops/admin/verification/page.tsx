"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationReviewQueue } from "@/components/marketplace/VerificationReviewQueue";
import { SupplierReviewQueue, type SupplierReviewCard } from "@/components/supplier/SupplierReviewQueue";
import type { VerificationDocumentRecord } from "@/lib/marketplace/verification-documents";
import type { SupplierOnboardingStatus } from "@/lib/marketplace/supplier-onboarding-status";

type QueueRow = {
  id: string;
  document_type: string;
  file_url: string;
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  companies?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
};

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type SupplierReviewRow = {
  id: string;
  onboarding_status: SupplierOnboardingStatus;
  profile_completion_percent: number;
  submitted_at: string | null;
  created_at: string;
  companies?: { name?: string; slug?: string; gst_number?: string } | { name?: string; slug?: string; gst_number?: string }[] | null;
  profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  supplier_trust_scores?: { trust_score?: number } | { trust_score?: number }[] | null;
};

export default function VerificationQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docResponse, supplierResponse] = await Promise.all([
        fetch("/api/ops/verification-queue?status=pending,in_review", { credentials: "include" }),
        fetch("/api/ops/supplier-review", { credentials: "include" }),
      ]);

      if (docResponse.ok) {
        const payload = await docResponse.json();
        setRows(payload.data ?? []);
      }

      if (supplierResponse.ok) {
        const payload = await supplierResponse.json();
        const cards = (payload.data ?? [] as SupplierReviewRow[]).map((row: SupplierReviewRow) => {
          const company = pickRelation(row.companies);
          const profile = pickRelation(row.profiles);
          const trust = pickRelation(row.supplier_trust_scores);
          return {
            id: row.id,
            companyName: company?.name ?? profile?.full_name ?? "Unknown",
            completionPercent: row.profile_completion_percent ?? 0,
            onboardingStatus: row.onboarding_status,
            trustScore: trust?.trust_score ?? 0,
            registrationDate: row.submitted_at ?? row.created_at,
            gstNumber: company?.gst_number,
            contactEmail: profile?.email,
            contactName: profile?.full_name,
            supplierHref: company?.slug ? `/suppliers/${company.slug}` : undefined,
          } satisfies SupplierReviewCard;
        });
        setSupplierRows(cards);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reviewSupplier = async (
    id: string,
    action: "approve" | "reject" | "request_changes" | "suspend",
    notes?: string,
  ) => {
    setActingId(id);
    try {
      const response = await fetch(`/api/ops/supplier-review/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (response.ok) {
        setSupplierRows((prev) => prev.filter((row) => row.id !== id));
      }
    } finally {
      setActingId(null);
    }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    try {
      const response = await fetch(`/api/ops/verification/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        setRows((prev) => prev.filter((row) => row.id !== id));
      }
    } finally {
      setActingId(null);
    }
  };

  const items = rows.map((row) => {
    const company = pickRelation(row.companies);
    const profile = pickRelation(row.profiles);
    const supplierName = company?.name ?? profile?.full_name ?? profile?.email ?? "Unknown supplier";

    return {
      id: row.id,
      documentType: row.document_type,
      fileUrl: row.file_url,
      status: row.status as VerificationDocumentRecord["status"],
      reviewerNotes: row.reviewer_notes,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      supplierName,
      supplierHref: company?.slug ? `/suppliers/${company.slug}` : undefined,
    };
  });

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Supplier verification queue</h1>
          <p className="ops-section-subtitle">
            Review business documents submitted by suppliers (supplier_success workflow)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Supplier profile reviews</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <SupplierReviewQueue
            suppliers={supplierRows}
            actingId={actingId}
            onAction={reviewSupplier}
          />
        )}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Document verification queue</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="ops-panel">
          <div className="ops-panel-body py-12 text-center text-sm text-slate-500">
            No documents awaiting review.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="ops-panel">
              <div className="ops-panel-body space-y-3">
                <VerificationReviewQueue items={[item]} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => void review(item.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actingId === item.id}
                    onClick={() => void review(item.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
