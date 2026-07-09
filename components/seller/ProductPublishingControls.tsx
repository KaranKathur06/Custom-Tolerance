'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, X, AlertCircle, RefreshCw, Package, Send, Edit2, Trash2,
} from 'lucide-react';

type SellerProduct = {
  id: string;
  product_name: string;
  capability?: string;
  materials?: string[];
  moq?: string;
  lead_time?: string;
  estimated_price_per_unit?: number;
  quantity_available?: number;
  certifications?: string[];
  is_featured?: boolean;
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  approval_notes?: string;
  published_at?: string;
  approved_at?: string;
  created_at: string;
};

type PublishingControlsProps = {
  onProductPublished?: (productId: string) => void;
};

export default function SellerProductPublishingControls({
  onProductPublished,
}: PublishingControlsProps) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/seller/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handlePublish = async (productId: string) => {
    setPublishingId(productId);
    try {
      const res = await fetch(`/api/dashboard/seller/products/${productId}/publish`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to publish');
      onProductPublished?.(productId);
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/dashboard/seller/products?id=${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchProducts();
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: '✏️ Draft' },
      pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⏳ Pending Review' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Rejected' },
    };
    const config = configs[status as keyof typeof configs] || configs.draft;
    return (
      <Badge className={`${config.bg} ${config.text} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const draftProducts = products.filter((p) => p.approval_status === 'draft');
  const pendingProducts = products.filter((p) => p.approval_status === 'pending_review');
  const approvedProducts = products.filter((p) => p.approval_status === 'approved');
  const rejectedProducts = products.filter((p) => p.approval_status === 'rejected');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Product Publishing</h2>
        </div>
        <p className="mt-1 text-slate-600">Create, submit, and manage your marketplace products</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchProducts}
            className="ml-4"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      )}

      {/* Create new product button */}
      {!loading && (
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base">
          <Package className="mr-2 h-5 w-5" /> Create New Product
        </Button>
      )}

      {/* Draft products section */}
      {draftProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Ready to Submit ({draftProducts.length})</h3>
            <Badge variant="secondary">{draftProducts.length}</Badge>
          </div>
          <div className="space-y-2">
            {draftProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isExpanded={expandedId === product.id}
                onToggleExpand={() => setExpandedId(expandedId === product.id ? null : product.id)}
                onPublish={() => handlePublish(product.id)}
                onEdit={() => setEditingId(product.id)}
                onDelete={() => handleDelete(product.id)}
                isLoading={publishingId === product.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending review section */}
      {pendingProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Awaiting Approval ({pendingProducts.length})</h3>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">{pendingProducts.length}</Badge>
          </div>
          <div className="space-y-2">
            {pendingProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isExpanded={expandedId === product.id}
                onToggleExpand={() => setExpandedId(expandedId === product.id ? null : product.id)}
                readOnly
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved products section */}
      {approvedProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Published ({approvedProducts.length})</h3>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{approvedProducts.length}</Badge>
          </div>
          <div className="space-y-2">
            {approvedProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isExpanded={expandedId === product.id}
                onToggleExpand={() => setExpandedId(expandedId === product.id ? null : product.id)}
                readOnly
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejected products section */}
      {rejectedProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Needs Revision ({rejectedProducts.length})</h3>
            <Badge variant="secondary" className="bg-red-100 text-red-700">{rejectedProducts.length}</Badge>
          </div>
          <div className="space-y-2">
            {rejectedProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                isExpanded={expandedId === product.id}
                onToggleExpand={() => setExpandedId(expandedId === product.id ? null : product.id)}
                onPublish={() => handlePublish(product.id)}
                onEdit={() => setEditingId(product.id)}
                isLoading={publishingId === product.id}
                showRejectionReason
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">No products yet</p>
          <p className="text-sm text-slate-600">Create your first product to get started</p>
        </div>
      )}
    </div>
  );
}

// Product Row Component
type ProductRowProps = {
  product: SellerProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPublish?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  readOnly?: boolean;
  showRejectionReason?: boolean;
};

function ProductRow({
  product,
  isExpanded,
  onToggleExpand,
  onPublish,
  onEdit,
  onDelete,
  isLoading,
  readOnly,
  showRejectionReason,
}: ProductRowProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-blue-300 transition">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full p-4 text-left hover:bg-slate-50 transition flex items-start justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-slate-900">{product.product_name}</h4>
            {getStatusBadge(product.approval_status)}
          </div>
          <p className="mt-1 text-sm text-slate-600">{product.capability}</p>
        </div>
        <ChevronRight className={`h-5 w-5 text-slate-400 transition ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
          {/* Specs grid */}
          <div className="grid gap-3 grid-cols-2">
            {product.moq && (
              <div>
                <p className="text-xs font-medium text-slate-600">MOQ</p>
                <p className="font-semibold text-slate-900">{product.moq}</p>
              </div>
            )}
            {product.lead_time && (
              <div>
                <p className="text-xs font-medium text-slate-600">Lead Time</p>
                <p className="font-semibold text-slate-900">{product.lead_time}</p>
              </div>
            )}
            {product.estimated_price_per_unit && (
              <div>
                <p className="text-xs font-medium text-slate-600">Price/Unit</p>
                <p className="font-semibold text-slate-900">${product.estimated_price_per_unit.toFixed(2)}</p>
              </div>
            )}
            {product.quantity_available && (
              <div>
                <p className="text-xs font-medium text-slate-600">Available</p>
                <p className="font-semibold text-slate-900">{product.quantity_available.toLocaleString()} units</p>
              </div>
            )}
          </div>

          {/* Materials */}
          {product.materials && product.materials.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Materials</p>
              <div className="flex flex-wrap gap-2">
                {product.materials.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {showRejectionReason && product.approval_notes && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">Rejection Reason</p>
              <p className="mt-1 text-sm text-red-600">{product.approval_notes}</p>
            </div>
          )}

          {/* Actions */}
          {!readOnly && (
            <div className="flex gap-2 pt-4 border-t border-slate-200">
              {product.approval_status === 'draft' || product.approval_status === 'rejected' ? (
                <>
                  <Button
                    size="sm"
                    onClick={onPublish}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {product.approval_status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                    disabled={isLoading}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {product.approval_status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onDelete}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export ChevronRight icon
import { ChevronRight } from 'lucide-react';

function getStatusBadge(status: string) {
  const configs = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: '✏️ Draft' },
    pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⏳ Pending Review' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Rejected' },
  };
  const config = configs[status as keyof typeof configs] || configs.draft;
  return (
    <Badge className={`${config.bg} ${config.text} border-0`}>
      {config.label}
    </Badge>
  );
}
