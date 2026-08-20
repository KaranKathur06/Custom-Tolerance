'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`, { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Could not load user');
        setPayload(result.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load user'));
  }, [params.id]);

  if (error) return <div className="ops-panel ops-panel-body">{error}</div>;
  if (!payload) return <div className="ops-panel ops-panel-body">Loading user...</div>;

  const user = payload.user;
  const persona = payload.sellerProfile || payload.buyerProfile;
  const personaLabel = payload.sellerProfile ? 'Seller Profile' : payload.buyerProfile ? 'Buyer Profile' : 'No marketplace profile';
  const initials = (user.fullName || user.email || 'U').slice(0, 2).toUpperCase();
  const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Not recorded';
  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (Array.isArray(value)) return value.join(', ') || 'Not provided';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  const excludedFields = new Set(['id', 'profile_id', 'company_id', 'created_at', 'updated_at', 'deleted_at']);
  const personaFields = persona ? Object.entries(persona).filter(([key]) => !excludedFields.has(key)) : [];

  return (
    <div className="ops-users-page" style={{ maxWidth: 1320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <button className="ops-icon-btn" onClick={() => router.back()}>Back to Users</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ops-icon-btn" onClick={() => router.push(`/ops/admin/users/${params.id}/activity`)}>Activity</button>
          <button className="ops-primary-action">More actions</button>
        </div>
      </div>

      <section className="ops-panel" style={{ padding: 26, background: 'linear-gradient(135deg, rgba(198,138,45,.18), rgba(16,16,16,.96) 52%)' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, display: 'grid', placeItems: 'center', background: '#C68A2D', color: '#111', fontSize: 24, fontWeight: 800 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ color: '#d5a94e', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Administrative user dossier</div>
            <h1 className="ops-section-title" style={{ margin: '4px 0 3px' }}>{user.fullName || 'Unnamed user'}</h1>
            <p className="ops-section-subtitle" style={{ margin: 0 }}>{user.email || 'No email available'} · ID {user.id}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="ops-role-chip">{payload.role}</span>
            <span className="ops-role-chip">{payload.enforcementStatus}</span>
            <span className="ops-role-chip">{payload.verificationStatus}</span>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '16px 0' }}>
        {[
          ['Profile completion', `${payload.stats?.profileCompletion ?? 0}%`],
          ['Listings', payload.stats?.totalListings ?? 0],
          ['RFQs', payload.stats?.totalRfqs ?? 0],
          ['Last login', formatDate(user.lastLoginAt)],
        ].map(([label, value]) => <div className="ops-panel ops-panel-body" key={label}><span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span><strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{value}</strong></div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, .8fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="ops-panel ops-panel-body">
            <h2 style={{ marginTop: 0 }}>Identity & governance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {[
                ['Full name', user.fullName], ['Email', user.email], ['Phone', user.phone], ['Role', payload.role],
                ['Account status', payload.accountStatus], ['Enforcement', payload.enforcementStatus], ['Verification', payload.verificationStatus], ['Profile status', payload.profileStatus],
                ['Joined', formatDate(user.createdAt)], ['Last login', formatDate(user.lastLoginAt)],
              ].map(([label, value]) => <div key={label}><div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{label}</div><strong>{formatValue(value)}</strong></div>)}
            </div>
          </section>

          <section className="ops-panel ops-panel-body">
            <h2 style={{ marginTop: 0 }}>{personaLabel}</h2>
            {personaFields.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{personaFields.map(([key, value]) => <div key={key}><div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{key.replaceAll('_', ' ')}</div><strong>{formatValue(value)}</strong></div>)}</div> : <p style={{ color: '#9ca3af' }}>This identity has no linked marketplace profile yet. The Auth account remains visible and governable.</p>}
          </section>

          {payload.company ? <section className="ops-panel ops-panel-body"><h2 style={{ marginTop: 0 }}>Business / company</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{Object.entries(payload.company).filter(([key]) => !excludedFields.has(key)).map(([key, value]) => <div key={key}><div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{key.replaceAll('_', ' ')}</div><strong>{formatValue(value)}</strong></div>)}</div></section> : null}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="ops-panel ops-panel-body"><h2 style={{ marginTop: 0 }}>Verification history</h2>{payload.verificationHistory?.length ? payload.verificationHistory.map((event: any) => <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}><strong>{event.action}</strong><div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div></div>) : <p style={{ color: '#9ca3af' }}>No verification decisions recorded.</p>}</section>
          <section className="ops-panel ops-panel-body"><h2 style={{ marginTop: 0 }}>Recent admin activity</h2>{payload.recentActivity?.length ? payload.recentActivity.map((event: any) => <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}><strong>{event.action}</strong><div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div></div>) : <p style={{ color: '#9ca3af' }}>No administrative activity recorded.</p>}</section>
        </div>
      </div>
    </div>
  );
}