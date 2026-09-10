"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Package, Loader2, AlertCircle, CheckCircle2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeaturedProductRow } from "@/components/onboarding/seller/types";
import { formatLeadTime, formatPrecision, formatProductStatus } from "@/lib/products/formatters";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Product = FeaturedProductRow & {
  id: string;
  createdAt?: string;
  imageUrl?: string;
  approvalStatus?: string;
  lifecycleStatus?: string;
  isPublished?: boolean;
  reviewFeedback?: { reason?: string | null; notes?: string | null } | null;
  featuredRequested?: boolean;
  draftVersion: number;
};

type Toast = { id: string; message: string; type: "success" | "error" };

// ─────────────────────────────────────────────────────────────────────────────
// Product card
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleVisible,
  onPublish,
  publishing,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onToggleVisible: () => void;
  onPublish: () => void;
  publishing: boolean;
}) {
  const canToggleVisibility = product.approvalStatus === "approved" && product.lifecycleStatus === "active";
  const status = formatProductStatus(product);
  const visibilityLabel = product.isVisible
    ? canToggleVisibility && product.approvalStatus === "approved" && product.lifecycleStatus === "active"
      ? "Visible"
      : "Ready"
    : "Hidden";
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
        product.isVisible ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"
      )}
    >
      <div className="mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={`${product.productName} product image`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-8 w-8" aria-hidden="true" />
            <span className="text-xs font-medium">No product image</span>
          </div>
        )}
      </div>

      {/* Featured badge */}
      {product.isFeatured ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">
          <Star className="h-3 w-3" />
          Featured
        </span>
      ) : null}

      {/* Product name */}
      <h3 className="mb-2 pr-16 text-sm font-bold text-slate-900 leading-snug">
        {product.productName}
      </h3>
      <span className="mb-3 inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
        {status.label}
      </span>

      {product.reviewFeedback?.reason || product.reviewFeedback?.notes ? (
        <div className={cn("mb-3 rounded-lg border p-3 text-xs", product.approvalStatus === "rejected" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          <p className="font-semibold">{product.approvalStatus === "rejected" ? "Admin review feedback" : "Admin approval note"}</p>
          {product.reviewFeedback.reason ? <p className="mt-1">{product.reviewFeedback.reason}</p> : null}
          {product.reviewFeedback.notes ? <p className="mt-1">{product.reviewFeedback.notes}</p> : null}
        </div>
      ) : null}

      {/* Tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {product.capability ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {product.capability}
          </span>
        ) : null}
        {product.materials.slice(0, 3).map((m) => (
          <span key={m} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            {m}
          </span>
        ))}
        {product.materials.length > 3 ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400">
            +{product.materials.length - 3} more
          </span>
        ) : null}
      </div>

      {/* Stats row */}
      <dl className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
        {product.toleranceCapability ? (
          <div>
            <dt className="font-semibold text-slate-400">Tolerance</dt>
            <dd className="text-slate-700">{formatPrecision(product.toleranceCapability)}</dd>
          </div>
        ) : null}
        {product.moq ? (
          <div>
            <dt className="font-semibold text-slate-400">MOQ</dt>
            <dd className="text-slate-700">{product.moq}</dd>
          </div>
        ) : null}
        {product.productionCapacity ? (
          <div>
            <dt className="font-semibold text-slate-400">Capacity/mo</dt>
            <dd className="text-slate-700">
              {product.productionCapacity} {product.productionCapacityUnit}
            </dd>
          </div>
        ) : null}
        {product.leadTime ? (
          <div>
            <dt className="font-semibold text-slate-400">Lead Time</dt>
            <dd className="text-slate-700">{formatLeadTime(product.leadTime)}</dd>
          </div>
        ) : null}
      </dl>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        {product.approvalStatus === "approved" && !product.isPublished ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Publish approved product"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            {publishing ? "Publishing" : "Publish"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleFeatured}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
            product.featuredRequested
              ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              : "border-slate-200 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700",
          )}
          title={product.featuredRequested ? "Cancel feature request" : "Request featured placement"}
        >
          <Star className="h-3.5 w-3.5" />
          {product.featuredRequested ? "Requested" : "Feature"}
        </button>
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={!canToggleVisibility}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
          title={canToggleVisibility ? (product.isVisible ? "Hide from buyers" : "Mark ready for buyer visibility after approval") : "Archived products cannot be made visible."}
        >
          {product.isVisible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
          )}
          {visibilityLabel}
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Edit product"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function FeaturedProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/seller/products");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        products: Array<Record<string, unknown>>;
      };
      setProducts(
        (data.products ?? []).map((p) => ({
          id: String(p.id ?? ""),
          productName: String(p.product_name ?? p.productName ?? ""),
          capability: String(p.capability ?? ""),
          materials: Array.isArray(p.materials) ? (p.materials as string[]) : [],
          toleranceCapability: String(p.tolerance_capability ?? p.toleranceCapability ?? ""),
          productionCapacity: String(p.monthly_capacity ?? p.productionCapacity ?? ""),
          productionCapacityUnit: String(p.production_capacity_unit ?? p.productionCapacityUnit ?? "pcs"),
          moq: String(p.moq ?? ""),
          leadTime: String(p.lead_time ?? p.leadTime ?? ""),
          isFeatured: Boolean(p.is_featured ?? p.isFeatured),
          featuredRequested: Boolean(p.featured_requested ?? p.featuredRequested),
          isPublished: Boolean(p.is_published ?? p.isPublished),
          isVisible: p.is_visible === true || p.isVisible === true,
          approvalStatus: String(p.approval_status ?? "draft"),
          lifecycleStatus: String(p.lifecycle_status ?? p.approval_status ?? "draft"),
          reviewFeedback: p.review_feedback && typeof p.review_feedback === "object" ? p.review_feedback as Product["reviewFeedback"] : null,
          draftVersion: Number(p.draft_version ?? 1),
          customTolerance: String(p.custom_tolerance ?? p.customTolerance ?? ""),
          createdAt: String(p.created_at ?? p.createdAt ?? ""),
          imageUrl: (() => {
            const images = Array.isArray(p.product_images) ? p.product_images as Array<Record<string, unknown>> : [];
            const primary = images.find((image) => image.is_primary) ?? images[0];
            return typeof primary?.url === "string" ? primary.url : undefined;
          })(),
        }))
      );
    } catch {
      addToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };


  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/dashboard/seller/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      addToast("Product deleted", "success");
    } catch {
      addToast("Failed to delete product", "error");
    }
  };

  const handlePublish = async (id: string) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setPublishingId(id);
    try {
      const response = await fetch(`/api/dashboard/seller/products/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: product.draftVersion }),
      });
      const payload = await response.json().catch(() => null) as { error?: string | { message?: string }; product?: { draft_version?: number; lifecycle_status?: string; is_published?: boolean } } | null;
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
        throw new Error(message || "Unable to publish product.");
      }
      setProducts((previous) => previous.map((item) => item.id === id ? { ...item, lifecycleStatus: "active", isPublished: true, isVisible: false, draftVersion: Number(payload?.product?.draft_version ?? item.draftVersion + 1) } : item));
      addToast("Approved product published. It is hidden until you make it visible.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Unable to publish product.", "error");
    } finally {
      setPublishingId(null);
    }
  };

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleField = async (id: string, field: "featuredRequested" | "isVisible", current: boolean) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    // Optimistic update
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: !current } : p)));
    try {
      const res = await fetch(`/api/dashboard/seller/products?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current, expectedVersion: product.draftVersion }),
      });
      const payload = await res.json().catch(() => null) as { error?: { message?: string }; product?: { draft_version?: number } } | null;
      if (!res.ok) throw new Error(payload?.error?.message || "Couldn't update product.");
      setProducts((previous) => previous.map((item) => item.id === id ? { ...item, draftVersion: Number(payload?.product?.draft_version ?? item.draftVersion + 1) } : item));
    } catch (error) {
      // Revert on failure
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: current } : p)));
      addToast(error instanceof Error ? error.message : "Couldn't update product.", "error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Featured Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your product catalog. Featured products appear at the top of your profile.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/seller/products/new")}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats bar */}
      {products.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-4">
          {[
            { label: "Total Products", value: products.length },
            { label: "Featured", value: products.filter((p) => p.isFeatured).length },
            { label: "Visible to Buyers", value: products.filter((p) => p.approvalStatus === "approved" && p.lifecycleStatus === "active" && p.isVisible).length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col rounded-xl border border-slate-200 bg-white px-5 py-3.5"
            >
              <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
              <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : products.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mb-1 text-base font-bold text-slate-700">No products yet</h3>
          <p className="mb-6 max-w-xs text-center text-sm text-slate-400">
            Add your first product to let buyers discover exactly what you make.
          </p>
          <Button onClick={() => router.push("/dashboard/seller/products/new")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add your first product
          </Button>
        </div>
      ) : (
        /* Product grid */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => router.push(`/dashboard/seller/products/${product.id}`)}
              onDelete={() => void handleDelete(product.id)}
              onToggleFeatured={() =>
                void toggleField(product.id, "featuredRequested", Boolean(product.featuredRequested))
              }
              onToggleVisible={() =>
                void toggleField(product.id, "isVisible", product.isVisible !== false)
              }
              onPublish={() => void handlePublish(product.id)}
              publishing={publishingId === product.id}
            />
          ))}

          {/* Add card */}
          <button
            type="button"
            onClick={() => router.push("/dashboard/seller/products/new")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white py-10 text-sm text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <Plus className="h-6 w-6" />
            Add Product
          </button>
        </div>
      )}


      {/* Toast stack */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
              t.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
