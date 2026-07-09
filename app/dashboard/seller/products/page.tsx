"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Package, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeaturedProductRow } from "@/components/onboarding/seller/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Product = FeaturedProductRow & {
  id: string;
  createdAt?: string;
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
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onToggleVisible: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
        product.isVisible ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"
      )}
    >
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
            <dd className="text-slate-700">{product.toleranceCapability}</dd>
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
            <dd className="text-slate-700">{product.leadTime}</dd>
          </div>
        ) : null}
      </dl>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onToggleFeatured}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
            product.isFeatured
              ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              : "border-slate-200 text-slate-500 hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
          )}
          title={product.isFeatured ? "Remove featured" : "Mark as featured"}
        >
          <Star className="h-3.5 w-3.5" />
          {product.isFeatured ? "Unfeature" : "Feature"}
        </button>

        <button
          type="button"
          onClick={onToggleVisible}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
          title={product.isVisible ? "Hide from buyers" : "Show to buyers"}
        >
          {product.isVisible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-slate-400" />
          )}
          {product.isVisible ? "Visible" : "Hidden"}
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
          isVisible: p.is_visible !== false && p.isVisible !== false,
          customTolerance: String(p.custom_tolerance ?? p.customTolerance ?? ""),
          createdAt: String(p.created_at ?? p.createdAt ?? ""),
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

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleField = async (id: string, field: "isFeatured" | "isVisible", current: boolean) => {
    // Optimistic update
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: !current } : p)));
    try {
      const res = await fetch(`/api/dashboard/seller/products?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: current } : p)));
      addToast("Failed to update product", "error");
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
            { label: "Visible to Buyers", value: products.filter((p) => p.isVisible).length },
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
              onEdit={() => router.push("/dashboard/seller/products/new")}
              onDelete={() => void handleDelete(product.id)}
              onToggleFeatured={() =>
                void toggleField(product.id, "isFeatured", Boolean(product.isFeatured))
              }
              onToggleVisible={() =>
                void toggleField(product.id, "isVisible", product.isVisible !== false)
              }
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
