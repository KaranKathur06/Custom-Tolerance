'use client';

import { useCallback, useMemo, useState } from 'react';
import { Save, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, any> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [key, row] of Object.entries(initialSettings)) {
      const v = row.value;
      next[key] = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    }
    return next;
  });
  const [query, setQuery] = useState('');

  const visibleKeys = useMemo(() => {
    const keys = Object.keys(initialSettings);
    const q = query.trim().toLowerCase();
    if (!q) return keys.sort();
    return keys
      .filter((k) => k.toLowerCase().includes(q) || (initialSettings[k]?.description ?? '').toLowerCase().includes(q))
      .sort();
  }, [initialSettings, query]);

  const parseValueForUpsert = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed);
    } catch {
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      if (!Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
      return raw;
    }
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const updates: Record<string, any> = {};
      for (const key of Object.keys(draft)) {
        const before = initialSettings[key]?.value;
        const afterRaw = draft[key];
        const afterParsed = parseValueForUpsert(afterRaw);

        const beforeStr = typeof before === 'string' ? before : JSON.stringify(before);
        const afterStr = typeof afterParsed === 'string' ? afterParsed : JSON.stringify(afterParsed);

        if (beforeStr !== afterStr) updates[key] = afterParsed;
      }

      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch('/api/settings/platform', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error?.message || `Failed to save (${res.status})`);
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [draft, initialSettings, parseValueForUpsert, router]);

  return (
    <div className="ops-settings-page">
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Platform Settings</h1>
          <p className="ops-section-subtitle">Live, audit-logged key/value configuration (no placeholder values).</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button
          className="ops-primary-action"
          type="button"
          onClick={() => void onSave()}
          disabled={saving || loading}
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="ops-settings-search">
        <div className="ops-settings-search-icon">
          <Search className="w-4 h-4" />
        </div>
        <input
          className="ops-settings-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by key or description…"
        />
      </div>

      {error && <div className="ops-panel-body py-4 text-center text-red-600">{error}</div>}
      
      {visibleKeys.length === 0 ? (
        <div className="ops-panel-body py-12 text-center text-slate-500">
          No platform settings found.
        </div>
      ) : (
        <div className="ops-settings-keyvals">
          {visibleKeys.map((key) => {
            const row = initialSettings[key];
            const desc = row?.description ?? '';
            return (
              <div key={key} className="ops-settings-row">
                <div className="ops-settings-row-meta">
                  <div className="ops-settings-key">{key}</div>
                  <div className="ops-settings-desc">
                    {desc ? desc : <span className="text-slate-500 italic">No description</span>}
                  </div>
                  {row?.updatedAt && (
                    <div className="ops-settings-updated">
                      Updated: {new Date(row.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="ops-settings-row-editor">
                  <textarea
                    className="ops-settings-textarea"
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    rows={6}
                  />
                  <div className="ops-settings-helper">
                    Enter JSON for objects/arrays; primitives may be entered as raw text (e.g. <code>true</code>, <code>3.5</code>).
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
