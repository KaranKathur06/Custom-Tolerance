'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClientKPICard as KPICard } from '@/components/ops/shared/ClientKPICard';
import { ArrowDownLeft, CreditCard, DollarSign, Download, TrendingUp } from 'lucide-react';

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

export default function FinancePage() {
  const [metrics, setMetrics] = useState<OpsAdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/admin/dashboard', { credentials: 'include' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload) throw new Error(payload?.error?.message || 'Failed to load metrics');
      setMetrics(payload as OpsAdminDashboardMetrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const totalPayments = metrics?.totalPayments ?? 0;
    const pendingListings = metrics?.pendingListings ?? 0;
    const totalSuppliers = metrics?.totalSuppliers ?? 0;

    return [
      {
        title: 'Successful Payments',
        value: String(totalPayments),
        icon: CreditCard,
        variant: 'success' as const,
      },
      {
        title: 'Payments Signal (Suppliers)',
        value: String(totalSuppliers),
        icon: TrendingUp,
        variant: 'info' as const,
      },
      {
        title: 'Listings in Moderation Queue',
        value: String(pendingListings),
        icon: ArrowDownLeft,
        variant: 'warning' as const,
      },
      {
        title: 'Operational Health',
        value: metrics?.timestamp ? 'Current' : '—',
        icon: DollarSign,
        variant: 'success' as const,
      },
    ];
  }, [metrics]);

  const exportLedger = async () => {
    setError('Ledger export is not available yet.');
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Revenue Operations</h1>
          <p className="ops-section-subtitle">Operational metrics dashboard (read-only until export and ledger workflows are enabled)</p>
        </div>
      </div>

      <div className="ops-kpi-grid">
        {kpis.map((k) => (
          <KPICard key={k.title} title={k.title} value={k.value} icon={k.icon} variant={k.variant as any} />
        ))}
      </div>

      <div className="ops-panel">
        <div className="ops-panel-header">
          <div className="ops-panel-title">Transaction History</div>
          <button className="ops-primary-action" type="button" disabled>
            <Download className="w-4 h-4" /> Export Ledger
          </button>
        </div>

        {loading ? (
          <div className="ops-panel-body py-12 text-center">Loading…</div>
        ) : error ? (
          <div className="ops-panel-body py-12 text-center text-red-600">{error}</div>
        ) : (
          <div className="ops-panel-body py-12">
            <div className="ops-muted-cell" style={{ padding: 16 }}>
              Ledger details will appear here once the finance data pipeline is connected.
            </div>
          </div>
        )}
      </div>

      <div className="ops-grid-3" style={{ marginTop: 16 }}>
        <div className="ops-panel">
          <div className="ops-panel-body">
            <p className="ops-mini-label">Supplier Payouts</p>
            <div className="ops-muted-cell" style={{ marginTop: 8 }}>
              No payout activity is available yet.
            </div>
          </div>
        </div>

        <div className="ops-panel">
          <div className="ops-panel-body">
            <p className="ops-mini-label">Reconciliation Actions</p>
            <div className="ops-muted-cell" style={{ marginTop: 8 }}>
              Reconciliation controls will be enabled once the ledger workflow is available.
            </div>
          </div>
        </div>

        <div className="ops-panel">
          <div className="ops-panel-body">
            <p className="ops-mini-label">Ops Events</p>
            <div className="ops-muted-cell" style={{ marginTop: 8 }}>
              Finance events will appear here as the ledger pipeline becomes available.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
