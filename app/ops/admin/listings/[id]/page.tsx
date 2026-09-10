'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Package, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';

type DetailPayload = {
  product: Record<string, any> & { profiles?: { full_name?: string | null; email?: string | null } };
  approvals: Array<Record<string, any>>;
  images: Array<{ id: string; url: string; is_primary: boolean }>;
};

function value(item: unknown) {
  if (item == null || item === '') return '-';
  if (Array.isArray(item)) return item.join(', ') || '-';
  return String(item);
}

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/admin/listings/${encodeURIComponent(params.id)}`, { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? 'Unable to load product details.');
        return;
      }
      setData(payload.data);
    };
    void load();
  }, [params.id]);

  if (error) return <div className="ops-panel ops-panel-body" role="alert">{error}</div>;
  if (!data) return <div className="ops-panel ops-panel-body">Loading product details...</div>;

  const { product, approvals, images } = data;
  const latestApproval = approvals[0];

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <Link href="/ops/admin/listings" className="ops-muted-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </Link>
          <h1 className="ops-section-title">{value(product.product_name)}</h1>
          <p className="ops-section-subtitle">Product details and moderation history</p>
        </div>
        {latestApproval?.status ? <StatusBadge status={latestApproval.status} /> : null}
      </div>

      <section className="ops-panel ops-panel-body" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            {images[0]?.url ? (
              <img src={images[0].url} alt={value(product.product_name)} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <div style={{ minHeight: 180, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.04)', borderRadius: 8, color: 'var(--ops-text-muted)' }}>
                <Package className="h-8 w-8" />
              </div>
            )}
          </div>
          <dl style={{ flex: '2 1 420px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, alignContent: 'start' }}>
            {[
              ['Seller', product.profiles?.full_name || product.profiles?.email],
              ['Capability', product.capability],
              ['Materials', product.materials],
              ['MOQ', product.moq],
              ['Lead time', product.lead_time],
              ['Price range', `${value(product.min_price)} - ${value(product.max_price)} ${value(product.currency)}`],
              ['Quantity available', product.quantity_available],
              ['Lifecycle', product.lifecycle_status || product.approval_status],
            ].map(([label, item]) => (
              <div key={String(label)}><dt className="ops-mini-label">{label}</dt><dd style={{ margin: 0 }}>{value(item)}</dd></div>
            ))}
          </dl>
        </div>
        {product.description ? <p style={{ color: 'var(--ops-text-secondary)', lineHeight: 1.6 }}>{product.description}</p> : null}
      </section>

      <section className="ops-panel ops-panel-body">
        <h2 style={{ marginTop: 0 }}>Approval history</h2>
        {approvals.length ? approvals.map((approval) => (
          <div key={approval.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid var(--ops-border)' }}>
            {approval.status === 'approved' ? <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--ops-success)' }} /> : approval.status === 'rejected' ? <XCircle className="h-4 w-4" style={{ color: 'var(--ops-danger)' }} /> : <Clock className="h-4 w-4" />}
            <div><strong>{value(approval.status)}</strong><div className="ops-muted-cell">Submitted {value(approval.created_at)}</div>{approval.rejection_reason ? <div>{approval.rejection_reason}</div> : null}</div>
          </div>
        )) : <p className="ops-muted-cell">No approval records found.</p>}
      </section>
    </div>
  );
}