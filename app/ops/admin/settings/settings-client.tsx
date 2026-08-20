'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Loader2, Search, ShieldCheck } from 'lucide-react';

type Setting = {
  key: string; category: string; label: string; description: string; type: string; value: unknown;
  version: number; updatedAt: string | null; editable: boolean; dangerous: boolean; consumer: string;
};

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  general: { title: 'General', description: 'Platform status, maintenance, and operating posture.' },
  registration: { title: 'Registration & Onboarding', description: 'Control who can enter buyer and seller journeys.' },
  verification: { title: 'Verification', description: 'Trust requirements that protect procurement actions.' },
  rfq: { title: 'RFQ & Procurement', description: 'Control requirement creation and draft workflows.' },
  marketplace: { title: 'Marketplace & Listings', description: 'Control public discovery and seller publication.' },
  notifications: { title: 'Notifications', description: 'Operational delivery preferences and retention.' },
  uploads: { title: 'Files & Uploads', description: 'Control supported upload surfaces and limits.' },
  payments: { title: 'Payments & Finance', description: 'Operational payment availability, never credentials.' },
  security: { title: 'Security', description: 'Admin protection and abuse-prevention controls.' },
  features: { title: 'Feature Flags', description: 'Availability controls for implemented capabilities.' },
  search: { title: 'Search & Matching', description: 'Discovery controls backed by current search behavior.' },
  compliance: { title: 'Compliance', description: 'Retention and policy requirements.' },
  integrations: { title: 'Integrations', description: 'Provider status and diagnostics without secrets.' },
  system: { title: 'System Health', description: 'Runtime health and deployment visibility.' },
  advanced: { title: 'Advanced Configuration', description: 'Restricted compatibility settings and metadata.' },
};

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'string') return value.replace(/_/g, ' ');
  return 'Configured';
}

async function loadSettings(category?: string) {
  const response = await fetch(category ? `/api/admin/settings/${category}` : '/api/admin/settings', { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Unable to load settings.');
  return payload.data as Setting[];
}

export function SettingsClient({ category }: { category?: string }) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setLoading(true); setError(null);
    void loadSettings(category).then((data) => {
      setSettings(data);
      setDrafts(Object.fromEntries(data.map((item) => [item.key, item.value])));
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')).finally(() => setLoading(false));
  }, [category]);

  const visibleSettings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return settings;
    return settings.filter((item) => `${item.key} ${item.label} ${item.description} ${item.category}`.toLowerCase().includes(normalized));
  }, [query, settings]);

  async function save(setting: Setting) {
    if (!setting.editable || drafts[setting.key] === undefined) return;
    if (setting.dangerous && !window.confirm(`Change ${setting.label}? This may affect active marketplace users.`)) return;
    setSavingKey(setting.key); setSavedKey(null); setError(null);
    try {
      const response = await fetch(`/api/admin/settings/${setting.category}`, {
        method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: setting.key, value: drafts[setting.key], expectedVersion: setting.version, reason: 'Updated from Settings Control Plane' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Unable to save setting.');
      setSettings((current) => current.map((item) => item.key === setting.key ? payload.data : item));
      setDrafts((current) => ({ ...current, [setting.key]: payload.data.value })); setSavedKey(setting.key);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save setting.'); }
    finally { setSavingKey(null); }
  }

  if (loading) return <div className="ops-panel-body py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" aria-label="Loading settings" /></div>;

  return <div className="ops-settings-page">
    <div className="ops-section-header"><div>
      {category ? <Link className="ops-settings-back" href="/ops/admin/settings"><ArrowLeft className="h-4 w-4" /> Settings overview</Link> : null}
      <h1 className="ops-section-title">{category ? CATEGORY_META[category]?.title ?? 'Settings' : 'Platform Settings'}</h1>
      <p className="ops-section-subtitle">{category ? CATEGORY_META[category]?.description : 'Control and govern CustomTolerance operational behavior.'}</p>
    </div>{category ? <span className="ops-settings-scope"><ShieldCheck className="h-4 w-4" /> Audited control plane</span> : null}</div>
    <div className="ops-settings-search"><Search className="h-4 w-4" aria-hidden="true" /><input className="ops-settings-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings, categories, or keys..." /></div>
    {error ? <div className="ops-settings-alert"><AlertTriangle className="h-4 w-4" />{error}</div> : null}
    {!category ? <div className="ops-settings-category-grid">{Object.entries(CATEGORY_META).map(([key, meta]) => {
      const items = settings.filter((item) => item.category === key);
      const active = items.filter((item) => item.value === true || ['open', 'live'].includes(String(item.value))).length;
      return <Link key={key} href={`/ops/admin/settings/${key}`} className="ops-settings-category-card"><div className="ops-settings-category-top"><span className="ops-settings-category-kicker">{key}</span><ChevronRight className="h-4 w-4" /></div><strong>{meta.title}</strong><p>{meta.description}</p><div className="ops-settings-category-foot"><span>{items.length ? `${active} active controls` : 'No active controls yet'}</span><span>{items.length ? 'Manage' : 'View status'}</span></div></Link>;
    })}</div> : <div className="ops-settings-control-list">{visibleSettings.length === 0 ? <div className="ops-panel-body py-12 text-center text-slate-500">No configurable settings are available in this category.</div> : visibleSettings.map((setting) => <div key={setting.key} className="ops-settings-control">
      <div className="ops-settings-control-copy"><div className="ops-settings-control-label">{setting.label} {setting.dangerous ? <span className="ops-settings-danger">Sensitive</span> : null}</div><p>{setting.description}</p><small>Consumer: {setting.consumer}</small><small>Last changed: {setting.updatedAt ? new Date(setting.updatedAt).toLocaleString() : 'Using safe default'}</small></div>
      <div className="ops-settings-control-input">{setting.type === 'boolean' ? <button type="button" className={`ops-setting-switch ${drafts[setting.key] ? 'active' : ''}`} onClick={() => setDrafts((current) => ({ ...current, [setting.key]: !current[setting.key] }))} disabled={!setting.editable} aria-pressed={Boolean(drafts[setting.key])}><span />{formatValue(drafts[setting.key])}</button> : setting.type === 'enum' ? <select className="ops-settings-select" value={String(drafts[setting.key])} onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))} disabled={!setting.editable}>{setting.key === 'marketplace_status' ? <><option value="open">Open</option><option value="limited">Limited</option><option value="closed">Closed</option></> : <><option value="live">Live</option><option value="maintenance">Maintenance</option><option value="limited">Limited</option><option value="read_only">Read-only</option></>}</select> : <span className="ops-settings-readonly">{formatValue(drafts[setting.key])}</span>}{setting.editable ? <button type="button" className="ops-primary-action ops-settings-save" onClick={() => void save(setting)} disabled={savingKey === setting.key}>{savingKey === setting.key ? <Loader2 className="h-4 w-4 animate-spin" /> : savedKey === setting.key ? <Check className="h-4 w-4" /> : null}{savingKey === setting.key ? 'Saving' : savedKey === setting.key ? 'Saved' : 'Save'}</button> : null}</div>
    </div>)}</div>}
  </div>;
}