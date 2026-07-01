"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CAPABILITIES_OPTIONS,
  MATERIAL_OPTIONS,
  TOLERANCE_OPTIONS,
  LEAD_TIME_OPTIONS,
  PRODUCTION_CAPACITY_UNITS,
} from "@/lib/marketplace/onboarding-v3";
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
// Empty form default
// ─────────────────────────────────────────────────────────────────────────────

const emptyForm = (): Omit<FeaturedProductRow, "id"> => ({
  productName: "",
  capability: "",
  materials: [],
  toleranceCapability: "",
  productionCapacity: "",
  productionCapacityUnit: "pcs",
  moq: "",
  leadTime: "",
  isFeatured: false,
  isVisible: true,
  customTolerance: "",
  certifications: [],
});

// ─────────────────────────────────────────────────────────────────────────────
// Multi-chip selector (reused locally)
// ─────────────────────────────────────────────────────────────────────────────

function ChipSelect({
  options,
  value,
  onChange,
  max,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value.includes(opt)
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product form modal
// ─────────────────────────────────────────────────────────────────────────────

function ProductFormModal({
  product,
  onSave,
  onClose,
  saving,
}: {
  product: Partial<FeaturedProductRow> | null;
  onSave: (data: Omit<FeaturedProductRow, "id">) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<FeaturedProductRow, "id">>(
    product ? { ...emptyForm(), ...product } : emptyForm()
  );

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {product?.productName ? "Edit Product" : "Add Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="space-y-5 px-6 py-5">
          {/* Product Name */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => update({ productName: e.target.value })}
              placeholder="e.g. CNC Turned Stainless Steel Shaft"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Capability */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Manufacturing Process
            </label>
            <select
              value={form.capability}
              onChange={(e) => update({ capability: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="">Select process...</option>
              {CAPABILITIES_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Materials */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Materials (select all that apply)
            </label>
            <ChipSelect
              options={MATERIAL_OPTIONS}
              value={form.materials}
              onChange={(v) => update({ materials: v })}
            />
          </div>

          {/* Tolerance + Capacity grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Tolerance Capability
              </label>
              <select
                value={form.toleranceCapability}
                onChange={(e) => update({ toleranceCapability: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">Select tolerance...</option>
                {TOLERANCE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Lead Time
              </label>
              <select
                value={form.leadTime}
                onChange={(e) => update({ leadTime: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">Select lead time...</option>
                {LEAD_TIME_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MOQ + Production Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                MOQ
              </label>
              <input
                type="text"
                value={form.moq}
                onChange={(e) => update({ moq: e.target.value })}
                placeholder="e.g. 100 pcs"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Production Capacity / Month
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.productionCapacity}
                  onChange={(e) => update({ productionCapacity: e.target.value })}
                  placeholder="e.g. 5000"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
                />
                <select
                  value={form.productionCapacityUnit}
                  onChange={(e) => update({ productionCapacityUnit: e.target.value })}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
                >
                  {PRODUCTION_CAPACITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visibility toggles */}
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => update({ isFeatured: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
              />
              <Star className="h-4 w-4 text-yellow-500" />
              Featured
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(e) => update({ isVisible: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              {form.isVisible ? (
                <Eye className="h-4 w-4 text-blue-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
              Visible to buyers
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving || !form.productName.trim()}
            className="min-w-[100px]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product"}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const [saving, setSaving] = useState(false);
  const [modalProduct, setModalProduct] = useState<Partial<FeaturedProductRow> | null | "new">(
    null
  );
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

  // ── Save (create or update) ─────────────────────────────────────────────────
  const handleSave = async (data: Omit<FeaturedProductRow, "id">) => {
    setSaving(true);
    try {
      const isEdit = typeof modalProduct === "object" && modalProduct !== null && (modalProduct as Product).id;
      const editId = isEdit ? (modalProduct as Product).id : null;

      const res = await fetch(
        `/api/dashboard/seller/products${editId ? `?id=${editId}` : ""}`,
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) throw new Error("Failed to save");
      setModalProduct(null);
      await fetchProducts();
      addToast(editId ? "Product updated" : "Product added", "success");
    } catch {
      addToast("Failed to save product", "error");
    } finally {
      setSaving(false);
    }
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
          onClick={() => setModalProduct("new")}
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
          <Button onClick={() => setModalProduct("new")} className="flex items-center gap-2">
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
              onEdit={() => setModalProduct(product)}
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
            onClick={() => setModalProduct("new")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white py-10 text-sm text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            <Plus className="h-6 w-6" />
            Add Product
          </button>
        </div>
      )}

      {/* Modal */}
      {modalProduct !== null ? (
        <ProductFormModal
          product={modalProduct === "new" ? {} : modalProduct}
          onSave={(data) => void handleSave(data)}
          onClose={() => setModalProduct(null)}
          saving={saving}
        />
      ) : null}

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
