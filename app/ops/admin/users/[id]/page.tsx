'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BUYER_PREFERENCE_FIELDS,
  normalizeDossierValue,
  selectDossierFields,
  selectSellerManufacturingFields,
  selectSellerPerformanceFields,
  type DossierField,
} from '@/lib/admin/user-dossier';

type DossierPayload = {
  role: 'buyer' | 'seller' | 'both' | 'admin' | 'unknown';
  profile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  secondaryProfile?: Record<string, unknown> | null;
  secondaryCompany?: Record<string, unknown> | null;
  secondarySellerExtended?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  sellerExtended?: Record<string, unknown> | null;
  buyerIndustries?: string[];
  buyerCategories?: string[];
  buyerImportCountries?: string[];
  metrics: Record<string, number | string | null>;
};

// ── Shared presentation primitives ──────────────────────────────────────────

function FieldGrid({ fields }: { fields: DossierField[] }) {
  if (!fields.length) return <p style={{ color: '#9ca3af' }}>No applicable information has been provided.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {fields.map((field) => (
        <div key={field.key}>
          <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{field.label}</div>
          <strong>{normalizeDossierValue(field.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => (
          <span key={item} className="ops-role-chip" style={{ fontSize: 12 }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ops-panel ops-panel-body"><h2 style={{ marginTop: 0 }}>{title}</h2>{children}</section>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(198,138,45,.3)' }} />
      <span style={{ color: '#d5a94e', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(198,138,45,.3)' }} />
    </div>
  );
}

// ── Role-specific dossier components ────────────────────────────────────────

function BuyerAdminDossier({ dossier }: { dossier: DossierPayload }) {
  const profileFields = selectDossierFields(dossier.profile, 'buyer', 'profile');
  const companyFields = selectDossierFields(dossier.company, 'buyer', 'company');
  const preferenceFields = dossier.preferences
    ? Object.entries(BUYER_PREFERENCE_FIELDS)
        .filter(([key]) => key in dossier.preferences!)
        .map(([key, label]) => ({ key, label, value: dossier.preferences![key] }))
    : [];
  const industries = dossier.buyerIndustries ?? [];
  const categories = dossier.buyerCategories ?? [];
  const importCountries = dossier.buyerImportCountries ?? [];

  return (
    <>
      <Section title="Buyer Profile"><FieldGrid fields={profileFields} /></Section>
      <Section title="Buyer Business / Company"><FieldGrid fields={companyFields} /></Section>
      <Section title="Buyer Procurement / Preferences"><FieldGrid fields={preferenceFields} /></Section>
      {(industries.length > 0 || categories.length > 0 || importCountries.length > 0) && (
        <Section title="Buyer Industries & Interests">
          <TagList label="Industries" items={industries} />
          <TagList label="Category interests" items={categories} />
          <TagList label="Countries imported from" items={importCountries} />
        </Section>
      )}
    </>
  );
}

function SellerAdminDossier({
  profile, company, sellerExtended,
}: {
  profile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  sellerExtended: Record<string, unknown> | null;
}) {
  const profileFields = selectDossierFields(profile, 'seller', 'profile');
  const companyFields = selectDossierFields(company, 'seller', 'company');
  const manufacturingFields = selectSellerManufacturingFields(company, sellerExtended);
  const performanceFields = selectSellerPerformanceFields(company);

  return (
    <>
      <Section title="Seller Profile"><FieldGrid fields={profileFields} /></Section>
      <Section title="Seller Business / Company"><FieldGrid fields={companyFields} /></Section>
      <Section title="Manufacturing & Capabilities"><FieldGrid fields={manufacturingFields} /></Section>
      <Section title="Seller Performance"><FieldGrid fields={performanceFields} /></Section>
    </>
  );
}

// ── Main page component ─────────────────────────────────────────────────────

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

  // ── Role-specific metric cards (no Orders — not yet implemented) ─────────
  const metricLabels: [string, string][] = dossier.role === 'buyer'
    ? [
        ['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`],
        ['RFQs', String(dossier.metrics.rfqs ?? '—')],
        ['Quotes received', String(dossier.metrics.quotesReceived ?? '—')],
      ]
    : dossier.role === 'seller'
      ? [
          ['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`],
          ['Listings', String(dossier.metrics.listings ?? '—')],
          ['Quotes submitted', String(dossier.metrics.quotesSubmitted ?? '—')],
        ]
      : dossier.role === 'both'
        ? [
            ['Profile completion', dossier.metrics.profileCompletion == null ? '—' : `${dossier.metrics.profileCompletion}%`],
            ['RFQs', String(dossier.metrics.rfqs ?? '—')],
            ['Listings', String(dossier.metrics.listings ?? '—')],
          ]
        : [];

  // ── Identity governance fields ────────────────────────────────────────────
  const identityFields: DossierField[] = [
    { key: 'fullName', label: 'Full name', value: user.fullName },
    { key: 'email', label: 'Email', value: user.email },
    { key: 'phone', label: 'Phone', value: user.phone },
    { key: 'role', label: 'Role', value: payload.role },
    { key: 'accountStatus', label: 'Account status', value: payload.accountStatus },
    { key: 'enforcementStatus', label: 'Enforcement', value: payload.enforcementStatus },
    { key: 'verificationStatus', label: 'Verification', value: payload.verificationStatus },
    { key: 'profileStatus', label: 'Profile status', value: payload.profileStatus },
    { key: 'createdAt', label: 'Joined', value: formatDate(user.createdAt) },
    { key: 'lastLoginAt', label: 'Last login', value: formatDate(user.lastLoginAt) },
  ];

  return (
    <div className="ops-users-page" style={{ maxWidth: 1320 }}>
      {/* Toolbar */}
      <div className="ops-admin-profile-toolbar">
        <button className="ops-text-action" onClick={() => router.back()}>Back to Users</button>
        <button className="ops-text-action" onClick={() => router.push(`/ops/admin/users/${params.id}/activity`)}>Activity</button>
      </div>

      {/* Identity header */}
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

      {/* Role-aware metric cards */}
      {metricLabels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '16px 0' }}>
          {metricLabels.map(([label, value]) => (
            <div className="ops-panel ops-panel-body" key={label}>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
              <strong style={{ display: 'block', marginTop: 8, fontSize: 20 }}>{value}</strong>
            </div>
          ))}
          <div className="ops-panel ops-panel-body">
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Last login</span>
            <strong style={{ display: 'block', marginTop: 8, fontSize: 16 }}>{formatDate(user.lastLoginAt)}</strong>
          </div>
        </div>
      )}

      {/* Two-column layout: dossier + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, .8fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Shared: Identity & Governance */}
          <Section title="Identity & governance"><FieldGrid fields={identityFields} /></Section>

          {/* Unknown / Admin — safe fallback */}
          {(dossier.role === 'unknown' || dossier.role === 'admin') && (
            <Section title="Profile configuration unavailable">
              <p style={{ color: '#9ca3af' }}>Role: {payload.role}. No buyer or seller dossier was selected.</p>
            </Section>
          )}

          {/* Buyer dossier */}
          {dossier.role === 'buyer' && <BuyerAdminDossier dossier={dossier} />}

          {/* Seller dossier */}
          {dossier.role === 'seller' && (
            <SellerAdminDossier
              profile={dossier.profile}
              company={dossier.company}
              sellerExtended={dossier.sellerExtended ?? null}
            />
          )}

          {/* Both — stacked with visual separation */}
          {dossier.role === 'both' && (
            <>
              <SectionDivider label="Buyer dossier" />
              <BuyerAdminDossier dossier={dossier} />
              <SectionDivider label="Seller dossier" />
              <SellerAdminDossier
                profile={dossier.secondaryProfile ?? null}
                company={dossier.secondaryCompany ?? null}
                sellerExtended={dossier.secondarySellerExtended ?? null}
              />
            </>
          )}
        </div>

        {/* Sidebar: Verification + Activity */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Section title="Verification history">
            {payload.verificationHistory?.length
              ? payload.verificationHistory.map((event: any) => (
                  <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                    <strong>{event.action}</strong>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div>
                  </div>
                ))
              : <p style={{ color: '#9ca3af' }}>No verification decisions recorded.</p>}
          </Section>
          <Section title="Recent admin activity">
            {payload.recentActivity?.length
              ? payload.recentActivity.map((event: any) => (
                  <div key={event.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                    <strong>{event.action}</strong>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(event.created_at)}</div>
                  </div>
                ))
              : <p style={{ color: '#9ca3af' }}>No administrative activity recorded.</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}

