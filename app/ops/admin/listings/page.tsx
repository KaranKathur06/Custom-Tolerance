'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { AlertTriangle, CheckCircle2, Eye, Clock, XCircle } from 'lucide-react';

type ListingRow = {
  id: string;
  title: string;
  seller: string;
  metalType: string;
  price: string;
  quantity: string;
  status: string;
  submitted: string;
  riskScore: number;
};

type AdminListingsResponse = {
  success: boolean;
  data: any[];
  meta?: {
    statusCounts?: any;
    total?: number;
  };
  error?: any;
};

function formatApproxTimeAgo(iso?: string | null) {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '-';

  const diffMs = Date.now() - t;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatMoneyINR(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '-';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ListingsPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [page] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const status = tab === 'pending' ? 'pending' : 'all';

      const res = await fetch(
        `/api/admin/listings/pending?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`,
        { credentials: 'include' },
      );

      const payload = (await res.json().catch(() => null)) as AdminListingsResponse | null;
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Failed to load listings');
      }

      const mapped: ListingRow[] = (payload.data ?? []).map((l: any) => {
        const sellerName =
          l?.companies?.[0]?.name ??
          l?.seller_profiles?.[0]?.company_name ??
          l?.seller_profiles?.company_name ??
          '-';

        const metalType = l?.metal_type ?? l?.metalType ?? '-';

        const priceMin = l?.price_min ?? l?.priceMin ?? null;
        const priceMax = l?.price_max ?? l?.priceMax ?? null;
        const unit = l?.price_unit ?? l?.unit ?? '/MT';

        const price =
          priceMin != null || priceMax != null
            ? `${formatMoneyINR(priceMin ?? priceMax)}${unit ? ` ${unit}` : ''}`
            : '-';

        const qty = l?.quantity_available ?? l?.quantity ?? null;
        const quantity = qty != null ? `${qty} MT` : l?.moq ? `${l.moq} MT` : '-';

        // Canonical submitted time from listing creation timestamp
        const submitted = formatApproxTimeAgo(l?.created_at ?? l?.submitted_at ?? null);

        // riskScore was previously mocked; keep UI stable but do not invent values
        // If backend later provides risk metrics, we can wire it here.
        const riskScore = Number.isFinite(l?.risk_score) ? Number(l.risk_score) : 0;

        return {
          id: String(l?.id ?? ''),
          title: String(l?.title ?? ''),
          seller: String(sellerName),
          metalType: String(metalType),
          price: String(price),
          quantity: String(quantity),
          status: String(l?.moderation_status ?? l?.status ?? ''),
          submitted,
          riskScore,
        };
      });

      setRows(mapped);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Listing Moderation</h1>
          <p className="ops-section-subtitle">Review, approve, and moderate marketplace listings</p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          borderBottom: '1px solid var(--ops-border)',
          paddingBottom: 0,
        }}
      >
        {(['pending', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tab === t ? 'var(--ops-accent-admin)' : 'var(--ops-text-muted)',
              borderBottom: tab === t ? '2px solid var(--ops-accent-admin)' : '2px solid transparent',
              textTransform: 'capitalize',
              transition: 'all 150ms',
            }}
          >
            {t === 'pending' ? 'Pending' : 'All Listings'}
          </button>
        ))}
      </div>

      {error ? <div className="ops-muted-cell" role="alert">{error}</div> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: loading ? 0.7 : 1 }}>
        {filtered.map((listing) => (
          <div key={listing.id} className="ops-panel" style={{ padding: 0 }}>
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--ops-text-muted)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {listing.id}
                  </span>

                  <StatusBadge status={listing.metalType} variant="neutral" dot={false} />
                  {listing.status ? <StatusBadge status={listing.status} /> : null}

                  {listing.riskScore > 20 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(239,68,68,0.1)',
                        color: 'var(--ops-danger)',
                      }}
                    >
                      <AlertTriangle className="w-3 h-3" /> Risk {listing.riskScore}%
                    </span>
                  ) : null}
                </div>

                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ops-text)', margin: 0 }}>
                  {listing.title}
                </p>

                <p style={{ fontSize: 12, color: 'var(--ops-text-secondary)', margin: '4px 0 0' }}>
                  {listing.seller} · {listing.price} · {listing.quantity}
                </p>

                <p style={{ fontSize: 11, color: 'var(--ops-text-muted)', margin: '2px 0 0' }}>
                  <Clock className="w-3 h-3" style={{ display: 'inline', verticalAlign: '-2px' }} /> Submitted{' '}
                  {listing.submitted}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {listing.status === 'pending' || listing.status === 'Pending' ? (
                  <>
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 6,
                        border: '1px solid rgba(34,197,94,0.3)',
                        background: 'rgba(34,197,94,0.08)',
                        color: 'var(--ops-success)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>

                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 14px',
                        borderRadius: 6,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)',
                        color: 'var(--ops-danger)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                ) : null}

                <button className="ops-icon-btn" title="View Details" type="button">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !loading ? (
          <div className="ops-muted-cell" style={{ padding: 16 }}>
            No listings found for this queue.
          </div>
        ) : null}
      </div>
    </div>
  );
}
