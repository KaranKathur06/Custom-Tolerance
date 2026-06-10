"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { SaveSupplierButton } from "@/components/marketplace/SaveSupplierButton";
import { SendInquiryButton } from "@/components/marketplace/SendInquiryModal";

type SupplierProfileCtaProps = {
  supplierId: string;
  supplierSlug: string;
  supplierName: string;
  isSaved?: boolean;
  recentActivity?: string | null;
};

export function SupplierProfileCta({
  supplierId,
  supplierSlug,
  supplierName,
  isSaved = false,
  recentActivity,
}: SupplierProfileCtaProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Get a quote</h3>
      <p className="mt-2 text-sm text-slate-600">
        Share your requirement, quantity, and timeline to receive a competitive
        quote from this supplier.
      </p>

      <div className="mt-5 space-y-3">
        <SendInquiryButton
          supplierId={supplierId}
          supplierName={supplierName}
          source="profile"
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-5 text-base font-bold"
        />
        <SaveSupplierButton
          supplierId={supplierId}
          initialSaved={isSaved}
          className="w-full rounded-xl"
        />
        <Link
          href={`/rfq/new?supplier=${supplierSlug}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-4 w-4" />
          Post full RFQ
        </Link>
      </div>

      {recentActivity ? (
        <p className="mt-4 text-xs text-slate-500">{recentActivity}</p>
      ) : null}
    </div>
  );
}
