'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, X, AlertCircle, RefreshCw, Filter, ChevronRight,
} from 'lucide-react';

type ProductApproval = {
  id: string;
  seller_product_id: string;
  seller_product?: {
    id: string;
    product_name: string;
    capability?: string;
    materials?: string[];
    moq?: string;
    lead_time?: string;
    estimated_price_per_unit?: number;
  };
  seller_profile?: {
    companyName?: string;
    location?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  reviewed_at?: string;
};

type ApprovalQueueProps = {
  filter?: 'pending' | 'approved' | 'rejected' | 'all';
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string, reason: string) => void;
};

export default function AdminProductApprovalQueue({
  filter = 'pending',
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<ProductApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>(filter);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = activeFilter === 'all'
        ? '/api/admin/products/approvals'
        : `/api/admin/products/approvals?status=${activeFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch approvals');
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading approvals');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApprove = async (approvalId: string) => {
    setActionLoading(approvalId);
    try {
      const res = await fetch('/api/admin/products/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action: 'approve',
          notes: 'Approved by admin',
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      onApprove?.(approvalId);
      fetchApprovals();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setActionLoading(approvalId);
    try {
      const res = await fetch('/api/admin/products/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action: 'reject',
          rejection_reason: rejectReason,
        }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      onReject?.(approvalId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      fetchApprovals();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filterOptions = [
    { label: 'Pending', value: 'pending' as const },
    { label: 'Approved', value: 'approved' as const },
    { label: 'Rejected', value: 'rejected' as const },
    { label: 'All', value: 'all' as const },
  ];

  const statusConfig = {
    pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Clock },
    approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
    rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: X },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Product Approval Queue</h2>
        <p className="mt-1 text-sm text-slate-600">Review and manage seller product submissions</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <Filter className="h-4 w-4 text-slate-400" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeFilter === opt.value
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchApprovals}
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
            <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && approvals.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">No approvals found</p>
          <p className="text-sm text-slate-600">No products match your current filter</p>
        </div>
      )}

      {/* Approvals list */}
      <div className="space-y-3">
        {approvals.map((approval) => {
          const product = approval.seller_product;
          const seller = approval.seller_profile;
          const config = statusConfig[approval.status as keyof typeof statusConfig];
          const Icon = config.icon;

          return (
            <div
              key={approval.id}
              className={`overflow-hidden rounded-lg border transition ${
                config.bg
              }`}
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === approval.id ? null : approval.id)}
                className="w-full p-4 text-left hover:opacity-80 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <h3 className="font-semibold text-slate-900">{product?.product_name}</h3>
                      <Badge variant="outline" className={`${config.text} ml-auto`}>
                        {approval.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>{product?.capability}</span>
                      {seller?.companyName && <span>{seller.companyName}</span>}
                      {seller?.location && <span>{seller.location}</span>}
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 transition ${
                      expandedId === approval.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === approval.id && (
                <div className="border-t border-current/10 p-4 space-y-4">
                  {/* Product specs */}
                  <div className="grid gap-4 grid-cols-2">
                    {product?.moq && (
                      <div>
                        <p className="text-xs text-slate-600">MOQ</p>
                        <p className="font-semibold text-slate-900">{product.moq}</p>
                      </div>
                    )}
                    {product?.lead_time && (
                      <div>
                        <p className="text-xs text-slate-600">Lead Time</p>
                        <p className="font-semibold text-slate-900">{product.lead_time}</p>
                      </div>
                    )}
                    {product?.estimated_price_per_unit && (
                      <div>
                        <p className="text-xs text-slate-600">Price</p>
                        <p className="font-semibold text-slate-900">${product.estimated_price_per_unit.toFixed(2)}/unit</p>
                      </div>
                    )}
                  </div>

                  {/* Materials */}
                  {product?.materials && product.materials.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-600">Materials</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.materials.map((m) => (
                          <Badge key={m} variant="secondary" className="text-xs">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {approval.status === 'rejected' && approval.rejection_reason && (
                    <div className="rounded bg-white/50 p-3 border border-current/20">
                      <p className="text-xs font-semibold text-slate-600">Rejection Reason</p>
                      <p className="mt-1 text-sm text-slate-900">{approval.rejection_reason}</p>
                    </div>
                  )}

                  {/* Admin notes */}
                  {approval.notes && (
                    <div className="rounded bg-white/50 p-3 border border-current/20">
                      <p className="text-xs font-semibold text-slate-600">Admin Notes</p>
                      <p className="mt-1 text-sm text-slate-900">{approval.notes}</p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Submitted: {new Date(approval.created_at).toLocaleDateString()}</p>
                    {approval.reviewed_at && (
                      <p>Reviewed: {new Date(approval.reviewed_at).toLocaleDateString()}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {approval.status === 'pending' && (
                    <div className="space-y-3 border-t border-current/10 pt-4">
                      {rejectingId === approval.id ? (
                        <>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Provide rejection reason for seller..."
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReject(approval.id)}
                              disabled={actionLoading === approval.id}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                              {actionLoading === approval.id ? (
                                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(approval.id)}
                            disabled={actionLoading === approval.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {actionLoading === approval.id ? (
                              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingId(approval.id)}
                            disabled={actionLoading === approval.id}
                          >
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
