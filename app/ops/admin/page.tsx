'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FileSearch,
  Gauge,
  HeartPulse,
  Radar,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

type OpsMetrics = {
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

const emptyMetrics: OpsMetrics = {
  totalUsers: 0,
  activeUsers: 0,
  totalListings: 0,
  pendingListings: 0,
  approvedListings: 0,
  totalSuppliers: 0,
  pendingSuppliers: 0,
  totalPayments: 0,
  recentUsers: 0,
  timestamp: new Date().toISOString(),
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

export default function AdminCommandCenter() {
  const [metrics, setMetrics] = useState<OpsMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('—');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch('/api/ops/admin/dashboard', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const nextMetrics = (await response.json()) as OpsMetrics;
        if (!active) return;

        setMetrics(nextMetrics);
        setLastUpdated(
          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        );
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load live metrics');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const pendingActions = metrics.pendingListings + metrics.pendingSuppliers;
  const status = pendingActions > 90 ? 'critical' : pendingActions > 40 ? 'warning' : 'healthy';

  const conversionRate =
    metrics.totalListings > 0 ? Math.round((metrics.approvedListings / metrics.totalListings) * 1000) / 10 : 0;

  const healthCards = useMemo(
    () => [
      {
        label: 'Active Users',
        value: formatNumber(metrics.activeUsers),
        href: '/ops/admin/users',
        icon: Users,
        tone: 'info',
      },
      {
        label: 'Active Suppliers',
        value: formatNumber(metrics.totalSuppliers),
        href: '/ops/admin/users',
        icon: Building2,
        tone: 'success',
      },
      {
        label: 'Active Listings',
        value: formatNumber(metrics.approvedListings),
        href: '/ops/admin/listings',
        icon: FileSearch,
        tone: 'success',
      },
      {
        label: 'Pending Listings',
        value: formatNumber(metrics.pendingListings),
        href: '/ops/admin/listings',
        icon: ClipboardList,
        tone: 'warning',
      },
      {
        label: 'Verification Requests',
        value: formatNumber(metrics.pendingSuppliers),
        href: '/ops/admin/verification',
        icon: ShieldCheck,
        tone: 'warning',
      },
      {
        label: 'Conversion Rate',
        value: `${conversionRate}%`,
        href: '/ops/crm/analytics',
        icon: TrendingUp,
        tone: 'warning',
      },
      {
        label: 'Pending Actions',
        value: formatNumber(pendingActions),
        href: '/ops/admin/moderation',
        icon: Zap,
        tone: 'danger',
      },
      {
        label: 'Payments (Success)',
        value: formatNumber(metrics.totalPayments),
        href: '/ops/admin/finance',
        icon: CircleDollarSign,
        tone: 'info',
      },
    ],
    [conversionRate, metrics, pendingActions],
  );

  const workspaceCards = useMemo(
    () => [
      { title: 'Supplier Intelligence', href: '/ops/admin/users', icon: Building2, meta: 'Verified, pending, suspended' },
      { title: 'RFQ Command Center', href: '/ops/crm/pipeline', icon: FileSearch, meta: 'Draft, active, quoted, negotiating, awarded' },
      { title: 'Quote Intelligence', href: '/ops/crm/analytics', icon: ClipboardList, meta: 'Response time, win rate, acceptance, volume' },
      { title: 'Trust Center', href: '/ops/admin/verification', icon: ShieldCheck, meta: 'GST, certificates, reviews, fraud monitoring' },
      { title: 'Revenue Center', href: '/ops/admin/finance', icon: CircleDollarSign, meta: 'MRR, ARR, commissions, failed payments' },
      { title: 'Content Center', href: '/ops/admin/cms', icon: BarChart3, meta: 'Listings, capabilities, homepage operations' },
      { title: 'Platform Settings', href: '/ops/admin/settings', icon: Gauge, meta: 'RBAC, feature flags, marketplace controls' },
      { title: 'System Health', href: '/ops/admin/security', icon: HeartPulse, meta: 'API health, uptime, live alerts, audit trails' },
    ],
    [],
  );

  return (
    <div className="mos-page">
      <section className="mos-hero">
        <div>
          <div className="mos-eyebrow">
            <Radar className="w-4 h-4" />
            CustomTolerance Marketplace OS
          </div>
          <h1>Marketplace Command Center</h1>
          <p>
            National-scale operating layer for suppliers, buyers, listings, trust, payments,
            and operational queues.
          </p>
        </div>

        <div className={`mos-status-card ${status}`}>
          <span>Marketplace Status</span>
          <strong>{status}</strong>
          <small>{loading ? 'Updating…' : `Updated ${lastUpdated}`}</small>
        </div>
      </section>

      <section className="mos-global-status">
        <div className={`mos-status-pill ${status}`}>
          <Activity className="w-4 h-4" />
          {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'}
        </div>

        <button className="mos-command-input" type="button">
          <Search className="w-4 h-4" />
          Search suppliers, RFQs, buyers, payments, GSTIN...
        </button>

        <button className="mos-quick-action-button" type="button">
          <Zap className="w-4 h-4" />
          Quick Actions
        </button>

        <div className="mos-system-alert">
          <Zap className="w-4 h-4" />
          {pendingActions} pending operational actions
        </div>
      </section>

      <section className="mos-health-grid">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className={`mos-health-card ${card.tone}`}>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </section>

      <section className="mos-grid-main">
        <div className="mos-panel mos-map-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Marketplace Map</h2>
              <p>City intel is displayed in the dedicated analytics view.</p>
            </div>
            <Link href="/ops/crm/analytics">
              City intelligence <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mos-map-body">
            <div className="mos-city-card">
              <span>Live City Workspace</span>
              <h3>—</h3>
              <div className="mos-city-metrics">
                <div>
                  <strong>{loading ? '—' : 'N/A'}</strong>
                  <span>Suppliers</span>
                </div>
                <div>
                  <strong>{loading ? '—' : 'N/A'}</strong>
                  <span>Buyers</span>
                </div>
                <div>
                  <strong>{loading ? '—' : 'N/A'}</strong>
                  <span>RFQs</span>
                </div>
                <div>
                  <strong>—</strong>
                  <span>Revenue</span>
                </div>
              </div>

              <button type="button" disabled={loading}>
                Open city intelligence
              </button>
            </div>
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Priority Action Queue</h2>
              <p>No hardcoded demo queue items. Use dedicated modules for operational details.</p>
            </div>
          </div>

          <div className="mos-action-list">
            {error ? (
              <div className="mos-empty-state">
                <strong>Live data unavailable</strong>
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="mos-empty-state">
                <strong>Loading live queue…</strong>
                <p>Fetching operational metrics.</p>
              </div>
            ) : (
              <div className="mos-empty-state">
                <strong>No live queue dataset provided to this widget yet.</strong>
                <p>Open a dedicated admin module for operational queues.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mos-grid-main">
        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>RFQ Command Pipeline</h2>
              <p>Pipeline stage counts are shown in the dedicated pipeline module.</p>
            </div>
          </div>

          <div className="mos-pipeline">
            <div className="mos-empty-state">
              <strong>{loading ? 'Loading…' : 'No pipeline stage counts provided by this endpoint.'}</strong>
              <p>
                Open <Link href="/ops/crm/pipeline" className="underline">RFQ Command Center</Link>.
              </p>
            </div>
          </div>

          <div className="mos-ai-strip">
            <Zap className="w-4 h-4" />
            Operations automation rules are enforced server-side. This panel does not render demo rules.
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Real-Time Event Stream</h2>
              <p>Event stream is rendered from live audit/log modules.</p>
            </div>
          </div>

          <div className="mos-event-stream">
            <div className="mos-empty-state">
              <strong>{loading ? 'Fetching events…' : 'No live event stream dataset provided to this widget yet.'}</strong>
              <p>Use audit/log views for live marketplace activity.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mos-panel">
        <div className="mos-panel-header">
          <div>
            <h2>Workspace Launcher</h2>
            <p>Control surfaces for every marketplace administration area.</p>
          </div>
        </div>

        <div className="mos-workspace-grid">
          {workspaceCards.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <Link key={workspace.title} href={workspace.href} className="mos-workspace-card">
                <Icon className="w-5 h-5" />
                <strong>{workspace.title}</strong>
                <span>{workspace.meta}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mos-grid-main">
        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Supplier Intelligence Snapshot</h2>
              <p>Open supplier modules for live ranking, verification, and risk posture.</p>
            </div>
          </div>

          <div className="mos-supplier-table">
            <div className="mos-empty-state">
              <strong>{loading ? 'Loading live snapshot…' : 'No supplier snapshot dataset provided to this widget yet.'}</strong>
              <p>
                Open <Link href="/ops/admin/users" className="underline">Supplier Intelligence</Link>.
              </p>
            </div>
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Fraud Detection Center</h2>
              <p>Open the dedicated security module for live abuse signals.</p>
            </div>
          </div>

          <div className="mos-fraud-grid">
            <div className="mos-empty-state">
              <strong>{loading ? 'Loading live signals…' : 'No fraud signal dataset provided to this widget yet.'}</strong>
              <p>
                Open <Link href="/ops/admin/security" className="underline">Security Center</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mos-quick-actions">
        <Zap className="w-5 h-5" />
        <div>
          <strong>Operations Center</strong>
          <p>
            Route live work into verification, RFQ intervention, failed payments, supplier risk review,
            listing moderation, and platform governance queues.
          </p>
        </div>
        <button type="button">Open quick actions</button>
      </section>
    </div>
  );
}
