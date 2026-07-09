"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSellerProductPage() {
  const router = useRouter();
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  useEffect(() => {
    // Create a draft seller product so the wizard has a stable entity.
    // Backend will later be extended to persist all blueprint fields.
    (async () => {
      try {
        const res = await fetch("/api/dashboard/seller/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: "",
            capability: null,
            materials: [],
            toleranceCapability: null,
            productionCapacity: null,
            productionCapacityUnit: "pcs",
            moq: null,
            leadTime: null,
            customTolerance: null,
            certifications: [],
            estimatedPrice: null,
            quantityAvailable: null,
            isFeatured: false,
            isVisible: true,
          }),
        });

        if (!res.ok) throw new Error("Failed to create draft");
        const data = (await res.json()) as { id?: string } & Record<string, unknown>;

        // Temporary: use id as slug until backend generates real slug.
        const slug = String(data.id ?? "");
        setCreatedSlug(slug);
        router.replace(`/dashboard/seller/products/${encodeURIComponent(slug)}`);
      } catch {
        // Fallback: still move into wizard with placeholder slug.
        const placeholder = "new";
        setCreatedSlug(placeholder);
        router.replace(`/dashboard/seller/products/${encodeURIComponent(placeholder)}`);
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Product Creation</h1>
      <p className="mt-2 text-sm text-slate-500">Preparing your draft workspace…</p>
      <div className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-pulse bg-slate-500" />
      </div>
      {createdSlug ? (
        <p className="mt-4 text-xs text-slate-400">Draft: {createdSlug}</p>
      ) : null}
    </div>
  );
}

