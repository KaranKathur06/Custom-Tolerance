'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KPICard } from '@/components/ops/shared/KPICard';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { AlertTriangle, Ban, Globe, Eye, Key, Lock, ShieldAlert } from 'lucide-react';

type HealthResponse = {
  success: boolean;
  data: {
    timestamp: string;
    status: string;
    metrics: {
      users: { total: number; newToday: number; new7d: number };
      listings: { active: number; pending: number };
      rfqs: { total: number; open: number };
      suppliers: { verified: number; pending: number };
      security: { activeRateLimits: number };
    };
    recentActivity: Array<{
      id: string;
      action: string | null;
      created_at: string;
    }>;
  };
};

type AuditLogRow = {
  id: string;
  action: string;
  severity?: string | null;
  resource?: string | null;
  created_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  user_id?: string | null;
};

function safeString(v: unknown) {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

export default function SecurityPage() {
  const [health, setHealth] = useState<HealthResponse['data'] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [healthRes, logsRes] = await Promise.all([
        fetch('/api/admin/health', { credentials: 'include' }),
        fetch('/api/admin/logs?page=1&limit=50', { credentials: 'include' }),
      ]);

      const healthJson: HealthResponse = await healthRes.json().catch(() => null as any);
      if (!healthRes.ok || !healthJson?.success || !healthJson?.data) {
        throw new Error(healthJson?.data ? 'Failed to load health metrics' : 'Failed to load health metrics');
      }

      const logsJson = await logsRes.json().catch(() => null as any);
      const logs: AuditLogRow[] = Array.isArray(logsJson?.data) ? (logsJson.data as AuditLogRow[]) : [];

      setHealth(healthJson.data);
      setAuditLogs(logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setHealth(null);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const derived = useMemo(() => {
    const rateLimitHits = health?.metrics.security.activeRateLimits ?? 0;

    // Best-effort “fraud alert” derivation from admin audit log actions/resources.
    // If there’s no matching action naming, UI will show empty state (no fake alerts).
    const fraudKeywordMatchers: Array<(x: string) => boolean> = [
      (x) => /fraud/i.test(x),
      (x) => /brute[_\s-]?force/i.test(x),
      (x) => /multi[_\s-]?account/i.test(x),
      (x) => /geo[_\s-]?anomaly/i.test(x),
      (x) => /failed[_\s-]?login/i.test(x),
      (x) => /login[_\s-]?fail/i.test(x),
      (x) => /suspicious/i.test(x),
    ];

    const alerts = auditLogs
      .map((l) => {
        const key = `${safeString(l.action)} ${safeString(l.resource)} ${safeString(l.user_id)}`;
        const isFraud = fraudKeywordMatchers.some((m) => m(key));
        return { log: l, isFraud };
      })
      .filter((x) => x.isFraud)
      .slice(0, 5)
      .map(({ log }) => {
        const action = safeString(log.action) || 'security.alert';
        const severity = /critical/i.test(action) ? 'critical' : /high/i.test(action) ? 'high' : 'medium';
        return {
          id: log.id,
          type: action,
          desc: safeString(log.resource) || 'Security signal detected',
          time: new Date(log.created_at).toLocaleString(),
          severity,
          ip: '—',
        };
      });

    const recentLogins = auditLogs
      .filter((l) => /login/i.test(`${safeString(l.action)} ${safeString(l.resource)}`))
      .slice(0, 6)
      .map((l) => {
        const action = safeString(l.action);
        const status = /fail|failed|denied|reject/i.test(action) ? 'Failed' : 'Success';
        return {
          id: l.id,
          user: l.profiles?.email || l.profiles?.full_name || 'Unknown',
          ip: '—',
          location: '—',
          device: '—',
          time: new Date(l.created_at).toLocaleString(),
          status,
        };
      });

    return {
      kpis: {
        activeSessions: '—',
        failedLogins24h: '—',
        blockedIps: '—',
        fraudAlerts: String(alerts.length),
        activeRateLimits: rateLimitHits,
      },
      alerts,
      recentLogins,
    };
  }, [auditLogs, health]);

  const kpiCards = useMemo(() => {
    // We do not invent numbers. If specific KPIs can’t be derived, show “—” or only security metrics we have.
    return [
      {
        title: 'Active Sessions',
        value: derived.kpis.activeSessions,
        icon: Key,
        variant: 'info' as const,
      },
      {
        title: 'Failed Logins (24h)',
        value: derived.kpis.failedLogins24h,
        change: undefined,
        icon: Lock,
        variant: 'warning' as const,
      },
      {
        title: 'Blocked IPs',
        value: derived.kpis.blockedIps,
        icon: Ban,
        variant: 'danger' as const,
      },
      {
        title: 'Fraud Alerts',
        value: derived.kpis.fraudAlerts,
        icon: ShieldAlert,
        variant: 'danger' as const,
      },
    ];
  }, [derived]);

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Security Center</h1>
          <p className="ops-section-subtitle">Live audit signals, rate-limit activity, and access-control events</p>
        </div>
        <button className="ops-primary-action" onClick={() => void load()} type="button" disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="ops-panel-body py-12 text-center">Loading…</div>
      ) : error ? (
        <div className="ops-panel-body py-12 text-center text-red-600">{error}</div>
      ) : (
        <>
          <div className="ops-kpi-grid">
            {kpiCards.map((c) => (
              <KPICard
                key={c.title}
                title={c.title}
                value={c.value}
                icon={c.icon}
                variant={c.variant as any}
              />
            ))}
          </div>

          <div className="ops-panel" style={{ marginBottom: 16 }}>
            <div className="ops-panel-header">
              <div className="ops-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ops-danger)' }} />
                Active Fraud Alerts (derived from live audit logs)
              </div>
            </div>

            {derived.alerts.length === 0 ? (
              <div className="ops-panel-body py-12 text-center text-sm text-slate-500">
                No fraud-related audit signals found.
              </div>
            ) : (
              <div className="ops-panel-body" style={{ padding: 0 }}>
                {derived.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--ops-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      background: alert.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'transparent',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ops-text-muted)' }}>
                          {alert.id}
                        </span>
                        <StatusBadge status={alert.severity} variant="danger" dot={false} />
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              alert.severity === 'critical'
                                ? 'rgba(239,68,68,0.15)'
                                : alert.severity === 'high'
                                  ? 'rgba(245,158,11,0.15)'
                                  : 'rgba(59,130,246,0.15)',
                            color:
                              alert.severity === 'critical'
                                ? 'var(--ops-danger)'
                                : alert.severity === 'high'
                                  ? 'var(--ops-warning)'
                                  : 'var(--ops-info)',
                          }}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ops-text)', margin: 0 }}>{alert.desc}</p>
                      <p style={{ fontSize: 11, color: 'var(--ops-text-muted)', margin: '2px 0 0' }}>
                        <Globe className="w-3 h-3" style={{ display: 'inline', verticalAlign: '-2px' }} /> {alert.ip} ·{' '}
                        {alert.time}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ops-icon-btn" title="Investigate" type="button">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="ops-icon-btn"
                        title="Block IP"
                        style={{ color: 'var(--ops-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                        type="button"
                        disabled
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ops-panel">
            <div className="ops-panel-header">
              <div className="ops-panel-title">Recent Login Activity (from live audit logs)</div>
            </div>

            {derived.recentLogins.length === 0 ? (
              <div className="ops-panel-body py-12 text-center text-sm text-slate-500">
                No login-related audit events found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ops-border)' }}>
                      {['User', 'IP Address', 'Location', 'Device', 'Time', 'Status'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'var(--ops-text-secondary)',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {derived.recentLogins.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--ops-border)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--ops-text)' }}>{row.user}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--ops-text-secondary)' }}>
                          {row.ip}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--ops-text-secondary)' }}>{row.location}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--ops-text-muted)', fontSize: 12 }}>{row.device}</td>
                        <td style={{ padding: '10px 16px', color: 'var(--ops-text-muted)', fontSize: 12 }}>{row.time}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <StatusBadge status={row.status} dot={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
