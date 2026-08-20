'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { normalizeDossierValue, selectDossierFields, type DossierField } from '@/lib/admin/user-dossier';

type DossierPayload = {
  role: 'buyer' | 'seller' | 'both' | 'admin' | 'unknown';
  profile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  secondaryProfile?: Record<string, unknown> | null;
  secondaryCompany?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  metrics: Record<string, number | string | null>;
};

function FieldGrid({ fields }: { fields: DossierField[] }) {
  if (!fields.length) return <p style={{ color: '#9ca3af' }}>No applicable information has been provided.</p>;
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{fields.map((field) => <div key={field.key}><div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{field.label}</div><strong>{normalizeDossierValue(field.value)}</strong></div>)}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ops-panel ops-panel-body"><h2 style={{ marginTop: 0 }}>{title}</h2>{children}</section>;
}

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
  const dossier = payload.dossier as DossierPayload;
  const initials = (user.fullName || user.email || 'U').slice(0, 2).toUpperCase();
  const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Not recorded';
  const profileFields = dossier.role === 'buyer' || dossier.role === 'seller' ? selectDossierFields(dossier.profile, dossier.role, 'profile') : [];
  const companyFields = dossier.role === 'buyer' || dossier.role === 'seller' ? selectDossierFields(dossier.company, dossier.role, 'company') : [];
  const preferenceFields = dossier.role === 'buyer' && dossier.preferences
    ? Object.entries(dossier.preferences).map(([key, value]) => ({ key, label: key.replaceAll('_', ' '), value }))
    : [];
  const metricLabels = dossier.role === 'buyer'
    ? [['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`], ['RFQs', dossier.metrics.rfqs ?? '—'], ['Quotes received', dossier.metrics.quotesReceived ?? '—'], ['Orders', dossier.metrics.orders ?? '—']]
    : dossier.role === 'seller'
      ? [['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`], ['Listings', dossier.metrics.listings ?? '—'], ['RFQs received', dossier.metrics.rfqsReceived ?? '—'], ['Orders', dossier.metrics.orders ?? '—']]
      : dossier.role === 'both'
        ? [['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`], ['RFQs', dossier.metrics.rfqs ?? '—'], ['Listings', dossier.metrics.listings ?? '—'], ['Orders', dossier.metrics.orders ?? '—']]
        : [];

  return (
    <div className="ops-users-page" style={{ maxWidth: 1320 }}>
      <div className="ops-admin-profile-toolbar"><button className="ops-text-action" onClick={() => router.back()}>Back to Users</button><button className="ops-text-action" onClick={() => router.push(`/ops/admin/users/${params.id}/activity`)}>Activity</button></div>
      <section className="ops-panel" style={{ padding: 26, background: 'linear-gradient(135deg, rgba(198,138,45,.18), rgba(16,16,16,.96) 52%)' }}><div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}><div style={{ width: 72, height: 72, borderRadius: 18, display: 'grid', placeItems: 'center', background: '#C68A2D', color: '#111', fontSize: 24, fontWeight: 800 }}>{initials}</div><div style={{ flex: 1, minWidth: 240 }}><div style={{ color: '#d5a94e', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Administrative user dossier</div><h1 className="ops-section-title" style={{ margin: '4px 0 3px' }}>{user.fullName || 'Unnamed user'}</h1><p className="ops-section-subtitle" style={{ margin: 0 }}>{user.email || 'No email available'} · ID {user.id}</p></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span className="ops-role-chip">{payload.role}</span><span className="ops-role-chip">{payload.enforcementStatus}</span><span className="ops-role-chip">{payload.verificationStatus}</span></div></div></section>
      {metricLabels.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '16px 0' }}>{metricLabels.map(([label, value]) => <div className="ops-panel ops-panel-body" key={label}><span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span><strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{value}</strong></div>)}<div className="ops-panel ops-panel-body"><span style={{ color: '#9ca3af', fontSize: 12 }}>Last login</span><strong style={{ display: 'block', marginTop: 8, fontSize: 16 }}>{formatDate(user.lastLoginAt)}</strong></div></div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, .8fr)', gap: 16, alignItems: 'start' }}><div style={{ display: 'grid', gap: 16 }}>
        <Section title="Identity & governance"><FieldGrid fields={['Full name', 'Email', 'Phone', 'Role', 'Account status', 'Enforcement', 'Verification', 'Profile status', 'Joined', 'Last login'].map((label) => ({ key: label, label, value: label === 'Full name' ? user.fullName : label === 'Email' ? user.email : label === 'Phone' ? user.phone : label === 'Role' ? payload.role : label === 'Account status' ? payload.accountStatus : label === 'Enforcement' ? payload.enforcementStatus : label === 'Verification' ? payload.verificationStatus : label === 'Profile status' ? payload.profileStatus : label === 'Joined' ? formatDate(user.createdAt) : formatDate(user.lastLoginAt) }))} /></Section>
        {dossier.role === 'unknown' || dossier.role === 'admin' ? <Section title="Profile configuration unavailable"><p style={{ color: '#9ca3af' }}>Role: {payload.role}. No buyer or seller dossier was selected.</p></Section> : null}
        {dossier.role === 'buyer' ? <><Section title="Buyer Profile"><FieldGrid fields={profileFields} /></Section><Section title="Buyer Business / Company"><FieldGrid fields={companyFields} /></Section><Section title="Buyer Procurement / Preferences"><FieldGrid fields={preferenceFields} /></Section></> : null}
        {dossier.role === 'seller' ? <><Section title="Seller Profile"><FieldGrid fields={profileFields} /></Section><Section title="Seller Business / Company"><FieldGrid fields={companyFields} /></Section><Section title="Manufacturing & Capabilities"><FieldGrid fields={profileFields.filter((field) => ['production_capacity', 'certifications'].includes(field.key))} /></Section><Section title="Seller Performance"><FieldGrid fields={companyFields.filter((field) => ['response_rate', 'avg_response_hours', 'completion_rate'].includes(field.key))} /></Section></> : null}
        {dossier.role === 'both' ? <><Section title="Buyer Profile"><FieldGrid fields={selectDossierFields(dossier.profile, 'buyer', 'profile')} /></Section><Section title="Buyer Business / Company"><FieldGrid fields={selectDossierFields(dossier.company, 'buyer', 'company')} /></Section><Section title="Buyer Procurement / Preferences"><FieldGrid fields={preferenceFields} /></Section><Section title="Seller Profile"><FieldGrid fields={selectDossierFields(dossier.secondaryProfile ?? null, 'seller', 'profile')} /></Section><Section title="Seller Business / Company"><FieldGrid fields={selectDossierFields(dossier.secondaryCompany ?? null, 'seller', 'company')} /></Section></> : null}
      </div><div style={{ display: 'grid', gap: 16 }}><Section title="Verification history">{payload.verificationHistory?.length ? payload.verificationHistory.map((event: any) => <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}><strong>{event.action}</strong><div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div></div>) : <p style={{ color: '#9ca3af' }}>No verification decisions recorded.</p>}</Section><Section title="Recent admin activity">{payload.recentActivity?.length ? payload.recentActivity.map((event: any) => <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}><strong>{event.action}</strong><div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div></div>) : <p style={{ color: '#9ca3af' }}>No administrative activity recorded.</p>}</Section></div></div>
    </div>
  );
}
