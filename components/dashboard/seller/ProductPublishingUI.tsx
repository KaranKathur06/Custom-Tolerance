"use client";

import { useSellerProducts, usePublishProduct } from "@/lib/products/hooks";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Package, RefreshCw, Rocket, X } from "lucide-react";

export function ProductPublishingUI() {
  const { products, loading, error, refetch } = useSellerProducts();
  const { publish, loading: publishing, error: publishError } = usePublishProduct();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePublish = async (productId: string) => {
    setMessage(null);
    try {
      const result = await publish(productId);
      if (result.success) {
        setMessage({
          type: "success",
          text: "Product submitted for marketplace approval! 🎉",
        });
        setSelectedProduct(null);
        refetch();
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Failed to publish product",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Package className="h-5 w-5 text-slate-400" />;
      case "pending_review":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "rejected":
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary" as const, label: "Draft" },
      pending_review: { variant: "default" as const, label: "Pending Review" },
      approved: { variant: "default" as const, label: "Published" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
    };
    const badge = badges[status];
    return badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null;
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
        <p className="mt-2 font-semibold text-red-900">{error}</p>
        <Button onClick={refetch} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Products</h2>
          <p className="mt-1 text-sm text-slate-500">Manage and publish products to marketplace</p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
            <p className="mt-4 text-sm text-slate-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 font-semibold text-slate-900">No products yet</p>
            <p className="text-sm text-slate-500">Create your first product to get started</p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">Create Product</Button>
          </div>
        ) : (
          products.map((product: any) => (
            <div
              key={product.id}
              className="rounded-lg border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header with icon and status */}
                  <div className="flex items-start gap-3">
                    {getStatusIcon(product.approval_status)}
                    <div>
                      <h3 className="font-semibold text-slate-900">{product.product_name}</h3>
                      <p className="text-sm text-slate-500">{product.capability}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(product.approval_status)}
                    {product.is_published && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        Live in Marketplace
                      </Badge>
                    )}
                  </div>

                  {/* Product details */}
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">MOQ</p>
                      <p className="text-slate-900">{product.moq || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Lead Time</p>
                      <p className="text-slate-900">{product.lead_time || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Est. Price/Unit</p>
                      <p className="text-slate-900">${product.estimated_price_per_unit || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Qty Available</p>
                      <p className="text-slate-900">{product.quantity_available || "—"}</p>
                    </div>
                  </div>

                  {/* Certifications */}
                  {product.certifications && product.certifications.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">Certifications</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.certifications.map((cert: string) => (
                          <Badge key={cert} variant="secondary">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {product.approval_status === "rejected" && product.approval_notes && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-900">Rejection Reason</p>
                      <p className="mt-1 text-sm text-red-700">{product.approval_notes}</p>
                    </div>
                  )}

                  {/* Approval timeline */}
                  <div className="flex gap-4 text-xs text-slate-500">
                    {product.published_at && (
                      <span>Published: {new Date(product.published_at).toLocaleDateString()}</span>
                    )}
                    {product.approved_at && (
                      <span>Approved: {new Date(product.approved_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {product.approval_status === "draft" && (
                    <Button
                      onClick={() => handlePublish(product.id)}
                      disabled={publishing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      {publishing ? "Publishing..." : "Publish"}
                    </Button>
                  )}

                  {product.approval_status === "pending_review" && (
                    <Button disabled variant="secondary">
                      <Clock className="mr-2 h-4 w-4" />
                      Under Review
                    </Button>
                  )}

                  {product.approval_status === "rejected" && (
                    <Button
                      onClick={() => handlePublish(product.id)}
                      disabled={publishing}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Republish
                    </Button>
                  )}

                  {product.approval_status === "approved" && (
                    <Button disabled variant="default" className="bg-emerald-600">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Published
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
