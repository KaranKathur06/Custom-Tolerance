'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileSearch,
  Gauge,
  HeartPulse,
  IndianRupee,
  Layers3,
  MapPin,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrendingUp,
  UserCheck,
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

const fallbackMetrics: OpsMetrics = {
  totalUsers: 2847,
  activeUsers: 912,
  totalListings: 1234,
  pendingListings: 23,
  approvedListings: 1042,
  totalSuppliers: 486,
  pendingSuppliers: 37,
  totalPayments: 184,
  recentUsers: 126,
  timestamp: new Date().toISOString(),
};

const cityIntel = [
  { city: 'Rajkot', suppliers: 78, buyers: 44, rfqs: 31, revenue: '18.4L', x: 22, y: 40, tone: 'success' },
  { city: 'Ahmedabad', suppliers: 102, buyers: 71, rfqs: 46, revenue: '31.2L', x: 28, y: 35, tone: 'info' },
  { city: 'Pune', suppliers: 91, buyers: 83, rfqs: 39, revenue: '27.8L', x: 35, y: 56, tone: 'success' },
  { city: 'Mumbai', suppliers: 84, buyers: 118, rfqs: 58, revenue: '43.6L', x: 29, y: 58, tone: 'warning' },
  { city: 'Ludhiana', suppliers: 64, buyers: 39, rfqs: 24, revenue: '14.9L', x: 35, y: 17, tone: 'info' },
  { city: 'Faridabad', suppliers: 52, buyers: 48, rfqs: 21, revenue: '11.7L', x: 43, y: 24, tone: 'danger' },
  { city: 'Chennai', suppliers: 73, buyers: 67, rfqs: 33, revenue: '22.6L', x: 57, y: 78, tone: 'success' },
  { city: 'Coimbatore', suppliers: 49, buyers: 35, rfqs: 18, revenue: '9.8L', x: 50, y: 83, tone: 'info' },
];

const workspaceCards = [
  { title: 'Supplier Intelligence', href: '/ops/admin/users', icon: Building2, meta: 'Verified, pending, suspended, risk scoring' },
  { title: 'Buyer Intelligence', href: '/ops/crm/customers', icon: Users, meta: 'Demand clusters, activation, procurement behavior' },
  { title: 'RFQ Command Center', href: '/ops/crm/pipeline', icon: FileSearch, meta: 'Draft, active, quoted, negotiating, awarded' },
  { title: 'Quote Intelligence', href: '/ops/crm/analytics', icon: ClipboardList, meta: 'Response time, win rate, acceptance, volume' },
  { title: 'Trust Center', href: '/ops/admin/verification', icon: ShieldCheck, meta: 'GST, certificates, reviews, fraud monitoring' },
  { title: 'Revenue Center', href: '/ops/admin/finance', icon: CircleDollarSign, meta: 'MRR, ARR, commissions, failed payments' },
  { title: 'Analytics Center', href: '/ops/crm/analytics', icon: BarChart3, meta: 'Growth, funnels, retention, conversion' },
  { title: 'Content Center', href: '/ops/admin/cms', icon: Layers3, meta: 'Listings, capabilities, homepage operations' },
  { title: 'Platform Settings', href: '/ops/admin/settings', icon: Gauge, meta: 'RBAC, feature flags, marketplace controls' },
  { title: 'System Health', href: '/ops/admin/security', icon: HeartPulse, meta: 'API health, uptime, live alerts, audit trails' },
];

const actionQueue = [
  { label: 'Pending GST verification', count: 37, owner: 'Trust Center', href: '/ops/admin/verification', severity: 'warning', icon: FileCheck2 },
  { label: 'Listings awaiting review', count: 23, owner: 'Content Center', href: '/ops/admin/listings', severity: 'info', icon: Layers3 },
  { label: 'Suspicious suppliers', count: 6, owner: 'Fraud Desk', href: '/ops/admin/security', severity: 'danger', icon: ShieldAlert },
  { label: 'Spam RFQs', count: 9, owner: 'RFQ Command', href: '/ops/crm/pipeline', severity: 'danger', icon: Siren },
  { label: 'Reported reviews', count: 12, owner: 'Moderation', href: '/ops/admin/moderation', severity: 'warning', icon: AlertTriangle },
  { label: 'Failed subscription payments', count: 8, owner: 'Revenue Center', href: '/ops/admin/finance', severity: 'danger', icon: IndianRupee },
];

const liveEvents = [
  { event: 'Supplier Verified', detail: 'Rajkot Precision Components cleared GST review', time: 'now', tone: 'success' },
  { event: 'New RFQ Posted', detail: 'CNC machined housings, 8 suppliers matched', time: '2 min', tone: 'info' },
  { event: 'Quote Submitted', detail: 'Ahmedabad supplier quoted RFQ CT-RFQ-7812', time: '5 min', tone: 'success' },
  { event: 'Review Reported', detail: 'Buyer flagged supplier review for manipulation', time: '8 min', tone: 'warning' },
  { event: 'Payment Failed', detail: 'Gold subscription renewal declined', time: '11 min', tone: 'danger' },
  { event: 'Quote Accepted', detail: 'Mumbai buyer awarded fabrication RFQ', time: '16 min', tone: 'success' },
];

const rfqStages = [
  { label: 'Draft', count: 18 },
  { label: 'Active', count: 64 },
  { label: 'Quoted', count: 42 },
  { label: 'Negotiating', count: 17 },
  { label: 'Awarded', count: 9 },
  { label: 'Completed', count: 31 },
  { label: 'Expired', count: 12 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

export default function AdminCommandCenter() {
  const [metrics, setMetrics] = useState<OpsMetrics>(fallbackMetrics);
  const [selectedCity, setSelectedCity] = useState(cityIntel[1]);
  const [lastUpdated, setLastUpdated] = useState('live');

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      try {
        const response = await fetch('/api/ops/admin/dashboard', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!response.ok) return;
        const nextMetrics = await response.json();
        if (active) {
          setMetrics({ ...fallbackMetrics, ...nextMetrics });
          setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch {
        if (active) setLastUpdated('demo mode');
      }
    }

    loadMetrics();
    const timer = window.setInterval(loadMetrics, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const pendingActions = metrics.pendingListings + metrics.pendingSuppliers + 35;
  const status = pendingActions > 90 ? 'critical' : pendingActions > 40 ? 'warning' : 'healthy';
  const conversionRate = metrics.totalListings
    ? Math.round((metrics.approvedListings / metrics.totalListings) * 1000) / 10
    : 0;

  const healthCards = useMemo(() => [
    { label: 'Active Buyers', value: formatNumber(Math.max(metrics.activeUsers - metrics.totalSuppliers, 0)), href: '/ops/crm/customers', icon: Users, tone: 'info' },
    { label: 'Active Suppliers', value: formatNumber(metrics.totalSuppliers), href: '/ops/admin/users', icon: Building2, tone: 'success' },
    { label: 'RFQs Today', value: '146', href: '/ops/crm/pipeline', icon: FileSearch, tone: 'info' },
    { label: 'Quotes Today', value: '392', href: '/ops/crm/analytics', icon: ClipboardList, tone: 'success' },
    { label: 'Revenue Today', value: 'Rs 42.8L', href: '/ops/admin/finance', icon: IndianRupee, tone: 'success' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, href: '/ops/crm/analytics', icon: TrendingUp, tone: 'warning' },
    { label: 'Verification Requests', value: formatNumber(metrics.pendingSuppliers), href: '/ops/admin/verification', icon: ShieldCheck, tone: 'warning' },
    { label: 'Pending Actions', value: formatNumber(pendingActions), href: '/ops/admin/moderation', icon: Zap, tone: 'danger' },
  ], [conversionRate, metrics, pendingActions]);

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
            National-scale operating layer for suppliers, buyers, RFQs, quotes,
            trust, revenue, city intelligence, and live intervention queues.
          </p>
        </div>
        <div className={`mos-status-card ${status}`}>
          <span>Marketplace Status</span>
          <strong>{status}</strong>
          <small>Updated {lastUpdated}</small>
        </div>
      </section>

      <section className="mos-global-status">
        <div className={`mos-status-pill ${status}`}>
          <Activity className="w-4 h-4" />
          {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'}
        </div>
        <button className="mos-command-input">
          <Search className="w-4 h-4" />
          Search suppliers, RFQs, buyers, payments, GSTIN...
        </button>
        <button className="mos-quick-action-button">
          <Zap className="w-4 h-4" />
          Quick Actions
        </button>
        <div className="mos-system-alert">
          <Siren className="w-4 h-4" />
          {actionQueue[2].count} high-risk supplier signals
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
              <p>Supplier, buyer, RFQ, revenue, and verification density across core industrial cities.</p>
            </div>
            <Link href="/ops/crm/analytics">City intelligence <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="mos-map-body">
            <div className="mos-india-map">
              {cityIntel.map((city) => (
                <button
                  key={city.city}
                  className={`mos-city-node ${city.tone} ${selectedCity.city === city.city ? 'active' : ''}`}
                  style={{ left: `${city.x}%`, top: `${city.y}%` }}
                  onClick={() => setSelectedCity(city)}
                  title={`${city.city} intelligence`}
                >
                  <span />
                  <strong>{city.city}</strong>
                </button>
              ))}
            </div>
            <div className="mos-city-card">
              <span>City Workspace</span>
              <h3>{selectedCity.city}</h3>
              <div className="mos-city-metrics">
                <div><strong>{selectedCity.suppliers}</strong><span>Suppliers</span></div>
                <div><strong>{selectedCity.buyers}</strong><span>Buyers</span></div>
                <div><strong>{selectedCity.rfqs}</strong><span>RFQs</span></div>
                <div><strong>Rs {selectedCity.revenue}</strong><span>Revenue</span></div>
              </div>
              <button>Open city intelligence</button>
            </div>
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Priority Action Queue</h2>
              <p>Operational work sorted by risk, revenue impact, and trust sensitivity.</p>
            </div>
          </div>
          <div className="mos-action-list">
            {actionQueue.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className={`mos-action-item ${item.severity}`}>
                  <Icon className="w-5 h-5" />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.owner}</span>
                  </div>
                  <b>{item.count}</b>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mos-grid-main">
        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>RFQ Command Pipeline</h2>
              <p>Pipeline view replacing passive table management.</p>
            </div>
          </div>
          <div className="mos-pipeline">
            {rfqStages.map((stage) => (
              <Link key={stage.label} href="/ops/crm/pipeline" className="mos-stage">
                <span>{stage.label}</span>
                <strong>{stage.count}</strong>
              </Link>
            ))}
          </div>
          <div className="mos-ai-strip">
            <Clock3 className="w-4 h-4" />
            Operations rule: escalate 11 RFQs with no supplier response after 4 hours.
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Real-Time Event Stream</h2>
              <p>Live marketplace events without manual refresh.</p>
            </div>
          </div>
          <div className="mos-event-stream">
            {liveEvents.map((item) => (
              <div key={`${item.event}-${item.time}`} className={`mos-event ${item.tone}`}>
                <span />
                <div>
                  <strong>{item.event}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mos-panel">
        <div className="mos-panel-header">
          <div>
            <h2>Workspace Launcher</h2>
            <p>Operating-system style entry points for every marketplace control surface.</p>
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
              <p>Approval, suspension, win rate, revenue, and risk posture.</p>
            </div>
          </div>
          <div className="mos-supplier-table">
            {[
              ['Apex CNC Works', 'Verified', '92', '41', '38%', 'Rs 18.2L', '12'],
              ['Faridabad Forging Co', 'Under Review', '64', '18', '21%', 'Rs 4.8L', '78'],
              ['Rajkot Tooling House', 'Pending GST', '71', '24', '31%', 'Rs 9.1L', '42'],
            ].map((row) => (
              <div key={row[0]} className="mos-supplier-row">
                <strong>{row[0]}</strong>
                <span>{row[1]}</span>
                <span>Profile {row[2]}</span>
                <span>{row[3]} listings</span>
                <span>{row[4]} win</span>
                <span>{row[5]}</span>
                <b>Risk {row[6]}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="mos-panel">
          <div className="mos-panel-header">
            <div>
              <h2>Fraud Detection Center</h2>
              <p>Duplicate identity and marketplace abuse monitoring.</p>
            </div>
          </div>
          <div className="mos-fraud-grid">
            {[
              ['Duplicate GST', 3, 'danger'],
              ['Duplicate Phone', 7, 'warning'],
              ['Duplicate PAN', 2, 'danger'],
              ['Duplicate Device', 11, 'warning'],
              ['RFQ Spam', 9, 'danger'],
              ['Review Manipulation', 4, 'warning'],
            ].map(([label, count, tone]) => (
              <Link key={label} href="/ops/admin/security" className={`mos-fraud-card ${tone}`}>
                <span>{label}</span>
                <strong>{count}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mos-quick-actions">
        <Zap className="w-5 h-5" />
        <div>
          <strong>Operations Center</strong>
          <p>Route live work into verification, RFQ intervention, failed payments, supplier risk review, listing moderation, and platform governance queues.</p>
        </div>
        <button>Open quick actions</button>
      </section>
    </div>
  );
}
