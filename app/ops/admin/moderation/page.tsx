'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KPICard } from '@/components/ops/shared/KPICard';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { AlertTriangle, CheckCircle2, Eye, Flag, Shield, XCircle } from 'lucide-react';

type ModerationQueueItem = {
  id: string;
  type: 'Listing' | 'SupplierReview' | 'VerificationDocument';
  subject: string;
  source: string;
  status: string;
  severity: string;
  createdAt?: string | null;
};

type OpsAdminDashboardMetrics = {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  totalSuppliers: number;
  pendingSuppliers: number;
  totalPayments: number;
  recentUsers: number;
  timestamp: string;
};

type AdminListingsResponse = {
  success: boolean;
  data: any[];
  meta?: { statusCounts?: any; total?: number };
  error?: any;
};

type ApiSuccessListResponse<T = unknown> = { success: boolean; data: T[] };

function safeNumber(n: unknown) {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN;
  return Number.isFinite(v) ? v : 0;
}

function formatPolicySla(pending: number, approved: number) {
  // No placeholder "demo SLA": derive a conservative completion ratio from live data.
  const total = pending + approved;
  if (total <= 0) return '0%';
  const pct = Math.round((approved / total) * 100);
  return `${pct}%`;
}

export default function ModerationPage() {
  const [metrics, setMetrics] = useState<OpsAdminDashboardMetrics | null>(null);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, listingsRes, supplierRes, verificationRes] = await Promise.all([
        fetch('/api/ops/admin/dashboard', { credentials: 'include' }),
        fetch('/api/admin/listings/pending?page=1&limit=50&status=pending', { credentials: 'include' }),
        fetch('/api/ops/supplier-review', { credentials: 'include' }),
        fetch('/api/ops/verification-queue', { credentials: 'include' }),
      ]);

      const metricsPayload = (await metricsRes.json().catch(() => null)) as
        | OpsAdminDashboardMetrics
        | { error?: any };

      if (!metricsRes.ok || !metricsPayload || (metricsPayload as any).error) {
        throw new Error('Failed to load moderation KPIs');
      }

      const listingsPayload = (await listingsRes.json().catch(() => null)) as AdminListingsResponse | null;
      if (!listingsRes.ok || !listingsPayload?.success) {
        throw new Error(listingsPayload?.error?.message || 'Failed to load pending listings');
      }

      const supplierPayload = (await supplierRes.json().catch(() => null)) as
        | ApiSuccessListResponse<any>
        | null;

      if (!supplierRes.ok || !supplierPayload?.success) {
        // allow partial data; queue will still render from other sources
      }

      const verificationPayload = (await verificationRes.json().catch(() => null)) as
        | ApiSuccessListResponse<any>
        | null;

      if (!verificationRes.ok || !verificationPayload?.success) {
        // allow partial data
      }

      const mappedListings: ModerationQueueItem[] = (listingsPayload.data ?? []).map((l: any) => ({
        id: `LIST-${String(l?.id ?? '')}`,
        type: 'Listing',
        subject: String(l?.title ?? 'Untitled listing'),
        source:
          l?.companies?.[0]?.name ??
          l?.seller_profiles?.[0]?.company_name ??
          l?.seller_profiles?.company_name ??
          '-',
        status: String(l?.moderation_status ?? 'pending'),
        severity: 'High',
        createdAt: l?.created_at ?? null,
      }));

      const mappedSuppliers: ModerationQueueItem[] = (supplierPayload?.data ?? []).map((s: any) => ({
        id: `SUP-${String(s?.id ?? '')}`,
        type: 'SupplierReview',
        subject: `Supplier onboarding: ${String(s?.companies?.business_type ?? s?.companies?.verification_status ?? 'Change requested')}`,
        source: String(s?.companies?.[0]?.name ?? s?.companies?.name ?? '-'),
        status: String(s?.onboarding_status ?? s?.verification_status ?? 'UNDER_REVIEW'),
        severity: s?.verification_status === 'verified' ? 'Medium' : 'High',
        createdAt: s?.submitted_at ?? s?.created_at ?? null,
      }));

      const mappedVerification: ModerationQueueItem[] = (verificationPayload?.data ?? []).map((d: any) => ({
        id: `VER-${String(d?.id ?? '')}`,
        type: 'VerificationDocument',
        subject: `${String(d?.document_type ?? 'Document')} verification`,
        source: String(d?.companies?.[0]?.name ?? d?.companies?.name ?? '-'),
        status: String(d?.status ?? 'pending'),
        severity: d?.status === 'in_review' ? 'Medium' : 'High',
        createdAt: d?.created_at ?? null,
      }));

      // Simple merge/dedupe by id
      const all = [...mappedListings, ...mappedSuppliers, ...mappedVerification];
      const byId = new Map<string, ModerationQueueItem>();
      for (const it of all) {
        if (!it.id) continue;
        byId.set(it.id, it);
      }

      setMetrics(metricsPayload as OpsAdminDashboardMetrics);
      setItems(Array.from(byId.values()).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMetrics(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const kpis = useMemo(() => {
    const pendingListings = safeNumber(metrics?.pendingListings);
    const approvedListings = safeNumber(metrics?.approvedListings);
    const pendingSuppliers = safeNumber(metrics?.pendingSuppliers);

    // Derived from live data only (no demo deltas)
    const openReviews = pendingListings;
    const highRiskQueue = pendingSuppliers;
    const resolvedToday = approvedListings;
    const policySla = formatPolicySla(pendingListings, approvedListings);

    return { openReviews, highRiskQueue, resolvedToday, policySla };
  }, [metrics]);

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Moderation Center</h1>
          <p className="ops-section-subtitle">Live moderation queues for listings, supplier onboarding, and verification documents.</p>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <KPICard title="Open Reviews" value={String(kpis.openReviews)} icon={Flag} variant="warning" />
        <KPICard title="High Risk Queue" value={String(kpis.highRiskQueue)} icon={AlertTriangle} variant="danger" />
        <KPICard title="Resolved (Approved)" value={String(kpis.resolvedToday)} icon={CheckCircle2} variant="success" />
        <KPICard title="Policy SLA" value={kpis.policySla} icon={Shield} variant="info" />
      </div>

      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <div className="ops-panel-title">Operational Moderation Queue</div>
            <p className="ops-section-subtitle">Each item is loaded from live backend queues and shows the current workflow state.</p>
          </div>
        </div>

        <div className="ops-moderation-list">
          {items.map((item) => (
            <div key={item.id} className="ops-moderation-row">
              <div>
                <span>{item.id}</span>
                <strong>{item.subject}</strong>
                <small>{item.type} · {item.source}</small>
              </div>
              <StatusBadge status={item.status} />
              <StatusBadge status={item.severity} />
              <div className="ops-row-actions">
                <button className="ops-icon-btn" title="Open" type="button" aria-label="Open">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="ops-icon-btn" title="Resolve" type="button" aria-label="Resolve">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button className="ops-icon-btn" title="Reject" type="button" aria-label="Reject">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 ? (
            <div className="ops-muted-cell" style={{ padding: 16 }}>
              No moderation queue items found.
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="ops-muted-cell" style={{ padding: 16 }} role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
