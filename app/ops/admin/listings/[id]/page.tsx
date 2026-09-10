'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock, Image as ImageIcon, Loader2, X, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import type { AdminListingDetailPayload } from '@/types/admin-listing-detail';
import {
  formatBooleanField,
  formatCapability,
  formatDisplayValue,
  formatGrade,
  formatIncoterm,
  formatIndustry,
  formatLeadTime,
  formatList,
  formatPackaging,
  formatPaymentTerm,
  formatPrecision,
  formatPriceType,
  formatPriceUnit,
  formatShippingType,
} from '@/lib/product/display';

// Type alias for the payload's data property
type DetailPayload = AdminListingDetailPayload['data'];

/**
 * Convert array of strings to comma-separated display value
 * The relations from the API are already normalized to string arrays by relationValues()
 */
function formatRelationArray(values: string[] | undefined | null): string | string[] {
  if (!values || values.length === 0) return '-';
  return values;
}

function display(item: unknown) {
  if (item == null || item === '') return 'Not provided';
  if (Array.isArray(item)) {
    if (item.length === 0) return 'Not provided';
    // For admin review, show all items joined with comma and space
    return item.join(', ');
  }
  return String(item);
}

function relation(items: unknown[], key: string) {
  return items.flatMap((item) => {
    if (typeof item === 'string') return item ? [item] : [];
    if (item && typeof item === 'object') {
      const value = (item as Record<string, unknown>)[key];
      return typeof value === 'string' && value ? [value] : [];
    }
    return [];
  });
}

function formatCollection(value: unknown, formatter: (item: unknown) => string): string[] {
  if (Array.isArray(value)) return formatList(value, formatter);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => formatter(item.trim()));
  return [];
}

function Field({ label, item }: { label: string; item: unknown }) {
  return <div style={{ borderTop: '1px solid var(--ops-border)', paddingTop: 10, minWidth: 0 }}><dt className="ops-mini-label">{label}</dt><dd style={{ margin: '5px 0 0', color: item == null || item === '' ? 'var(--ops-text-muted)' : 'var(--ops-text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.55 }}>{display(item)}</dd></div>;
}

function LongField({ label, item }: { label: string; item: unknown }) {
  return <div style={{ gridColumn: '1 / -1' }}><Field label={label} item={item} /></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ops-panel ops-panel-body" style={{ marginBottom: 16 }}><h2 style={{ margin: '0 0 16px', fontSize: 16 }}>{title}</h2>{children}</section>;
}

function Grid({ children }: { children: ReactNode }) {
  return <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>{children}</dl>;
}

export default function ListingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

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

  const review = async (action: 'approve' | 'reject') => {
    const approvalId = data?.approvals.find((approval) => approval.status === 'pending')?.id;
    if (!approvalId) {
      setError('There is no pending approval for this product. Return to the queue and refresh it.');
      return;
    }
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Enter a rejection reason before rejecting this product.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/products/approvals', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, action, rejection_reason: rejectionReason.trim() || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload?.error?.code === 'APPROVAL_NOT_PENDING') {
          window.location.reload();
          return;
        }
        if (payload?.error?.code === 'APPROVAL_NOT_FOUND') {
          window.location.reload();
          return;
        }
        if (payload?.error?.code === 'ADMIN_ACCESS_REQUIRED') {
          throw new Error('The moderation database rejected admin authorization. No review decision was recorded.');
        }
        if (response.status === 409) {
          throw new Error('This product was already reviewed by another team member. Refresh the page to see the latest decision.');
        }
        throw new Error(payload?.error?.message ?? 'The moderation action could not be completed.');
      }
      if (!payload?.success) {
        throw new Error(payload?.error?.message ?? 'The moderation action could not be completed.');
      }
      router.push('/ops/admin/listings');
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'The moderation action could not be completed.');
    } finally {
      setActing(false);
    }
  };

  if (error && !data) return <div className="ops-panel ops-panel-body" role="alert">{error}</div>;
  if (!data) return <div className="ops-panel ops-panel-body">Loading product review...</div>;

  const { product, approvals, images, relations } = data;
  const latestApproval = approvals[0];
  const pending = approvals.some((approval) => approval.status === 'pending');
  
  // The relations are already normalized to string arrays by the admin API's relationValues() function
  // No need to extract keys - they're already primitive values
  const capabilities = formatList(relations.capabilities || [], formatCapability);
  const industries = formatList(relations.industries || [], formatIndustry);
  const materials = formatList(relations.materials || [], formatDisplayValue);
  const grades = formatList(relations.grades || [], formatGrade);
  const paymentTerms = formatList(relations.paymentTerms || [], formatPaymentTerm);
  const incoterms = formatList(relations.incoterms || [], formatIncoterm);

  return <div>
    <div className="ops-section-header">
      <div>
        <Link href="/ops/admin/listings" className="ops-muted-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><ArrowLeft className="h-4 w-4" /> Back to listings</Link>
        <h1 className="ops-section-title">{display(product.product_name)}</h1>
        <p className="ops-section-subtitle">Complete product review dossier</p>
      </div>
      {latestApproval?.status ? <StatusBadge status={latestApproval.status} /> : null}
    </div>

    <Section title="Product identity"><Grid>
      <Field label="Seller" item={product.profiles?.full_name || product.profiles?.email} />
      <Field label="Product name" item={product.product_name} />
      <LongField label="Capabilities" item={capabilities.length > 0 ? capabilities : formatCollection(product.capabilities ?? product.capability, formatCapability)} />
      <LongField label="Industries served" item={industries.length > 0 ? industries : formatCollection(product.industries, formatIndustry)} />
      <LongField label="Materials" item={materials.length > 0 ? materials : formatCollection(product.materials, formatDisplayValue)} />
      <LongField label="Grades" item={grades.length > 0 ? grades : formatCollection(product.grades, formatGrade)} />
      <LongField label="Country of origin" item={product.country_of_origin ?? product.countryOfOrigin ?? product.origin_country ?? 'Not provided'} />
      <LongField label="Description" item={product.description ?? product.product_description ?? 'Not provided'} />
    </Grid></Section>

    <Section title="Technical specification"><Grid>
      <Field label="Specification" item={product.specification} />
      <Field label="Tolerance capability" item={product.tolerance_capability ? formatPrecision(product.tolerance_capability) : null} />
      <Field label="Quality certificate" item={product.quality_certificate} />
      <Field label="Brand marking" item={product.brand_marking === 'other' ? product.brand_marking_other : formatDisplayValue(product.brand_marking)} />
      <Field label="Dies and tools" item={formatDisplayValue(product.dies_and_tools)} />
      <Field label="Estimated tool cost" item={product.estimated_tool_cost} />
      <Field label="Tool ownership" item={product.tool_ownership} />
      <Field label="Tool lead time" item={product.tool_lead_time} />
    </Grid></Section>

    <Section title="Commercial terms"><Grid>
      <Field label="Price type" item={product.price_type ? formatPriceType(product.price_type) : null} />
      <Field label="Minimum price" item={product.min_price != null ? `${product.min_price} ${product.currency ?? ''}` : null} />
      <Field label="Maximum price" item={product.max_price != null ? `${product.max_price} ${product.currency ?? ''}` : null} />
      <Field label="Price unit" item={product.price_unit ? formatPriceUnit(product.price_unit) : null} />
      <Field label="Minimum order quantity" item={product.moq} />
      <Field label="Monthly capacity" item={product.monthly_capacity != null ? `${product.monthly_capacity} ${product.production_capacity_unit ?? ''}` : null} />
      <Field label="Lead time" item={product.lead_time ? formatLeadTime(product.lead_time) : null} />
      <Field label="Payment terms" item={paymentTerms.length > 0 ? paymentTerms : formatCollection(product.payment_terms, formatPaymentTerm)} />
      <Field label="Incoterms" item={incoterms.length > 0 ? incoterms : formatCollection(product.incoterms, formatIncoterm)} />
      <Field label="Delivery terms" item={product.delivery_terms} />
      <Field label="Free sample" item={formatBooleanField(product.free_sample, 'availability')} />
      <Field label="Sample shipping cost" item={product.sample_shipping_cost} />
      <Field label="Third-party inspection" item={formatBooleanField(product.third_party_inspection, 'availability')} />
    </Grid></Section>

    <Section title="Packaging and logistics"><Grid>
      <Field label="Weight" item={product.weight_value != null ? `${product.weight_value} ${product.weight_unit ?? ''}` : null} />
      <Field label="Dimensions" item={product.dim_length != null ? `${product.dim_length} x ${product.dim_width} x ${product.dim_height} ${product.dim_unit ?? ''}` : null} />
      <Field label="Shipping type" item={product.shipping_type ? formatShippingType(product.shipping_type) : null} />
      <Field label="Primary packaging" item={product.primary_packaging ? formatPackaging(product.primary_packaging) : null} />
      <Field label="Secondary packaging" item={product.secondary_packaging ? formatPackaging(product.secondary_packaging) : null} />
      <Field label="Packaging notes" item={product.packaging_notes} />
    </Grid></Section>

    <Section title={`Product media (${images.length})`}>
      {images.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              style={{ padding: 0, border: image.is_primary ? '2px solid var(--ops-accent-admin)' : '1px solid var(--ops-border)', borderRadius: 8, overflow: 'hidden', background: 'transparent', cursor: 'pointer' }}
              aria-label={`Open image ${index + 1} of ${images.length}`}
            >
              <img
                src={image.url}
                alt={`${display(product.product_name)} product media`}
                style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="ops-muted-cell" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon className="h-4 w-4" /> No product media submitted.</div>
      )}
      {activeImageIndex !== null && images[activeImageIndex] ? (
        <ProductMediaLightbox
          images={images}
          index={activeImageIndex}
          onClose={() => setActiveImageIndex(null)}
          onPrev={() => setActiveImageIndex((index) => index === null ? null : (index - 1 + images.length) % images.length)}
          onNext={() => setActiveImageIndex((index) => index === null ? null : (index + 1) % images.length)}
        />
      ) : null}
    </Section>

    <Section title="Approval history">
      {approvals.length ? approvals.map((approval) => <div key={approval.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid var(--ops-border)' }}>{approval.status === 'approved' ? <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--ops-success)' }} /> : approval.status === 'rejected' ? <XCircle className="h-4 w-4" style={{ color: 'var(--ops-danger)' }} /> : <Clock className="h-4 w-4" />}<div><strong>{display(approval.status)}</strong><div className="ops-muted-cell">Submitted {display(approval.created_at)}</div>{approval.rejection_reason ? <div>{approval.rejection_reason}</div> : null}</div></div>) : <p className="ops-muted-cell">No approval records found.</p>}
    </Section>

    <section className="ops-panel ops-panel-body" style={{ marginBottom: 24, borderColor: pending ? 'rgba(212,175,55,.45)' : 'var(--ops-border)' }}>
      <h2 style={{ marginTop: 0 }}>Final review decision</h2>
      {error ? <div role="alert" style={{ marginBottom: 12, color: 'var(--ops-danger)' }}>{error}</div> : null}
      {pending ? <><label className="ops-mini-label" htmlFor="rejection-reason">Rejection reason (required when rejecting)</label><textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explain what the seller needs to correct..." rows={3} style={{ display: 'block', width: '100%', margin: '8px 0 14px', padding: 10, color: 'var(--ops-text)', background: 'var(--ops-bg)', border: '1px solid var(--ops-border)', borderRadius: 8, resize: 'vertical' }} /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={() => void review('reject')} disabled={acting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7, border: '1px solid rgba(239,68,68,.45)', background: 'rgba(239,68,68,.1)', color: 'var(--ops-danger)', fontWeight: 700 }}>{acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject product</button><button type="button" onClick={() => void review('approve')} disabled={acting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7, border: '1px solid rgba(34,197,94,.45)', background: 'rgba(34,197,94,.1)', color: 'var(--ops-success)', fontWeight: 700 }}>{acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve product</button></div></> : <p className="ops-muted-cell">This product has already been reviewed. The decision is recorded above.</p>}
    </section>
  </div>;
}

function ProductMediaLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: { id: string; url: string; is_primary?: boolean | null }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const activeImage = images[index];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  if (!activeImage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Product media gallery"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24 }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image gallery"
        style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <X className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous image"
        style={{ position: 'absolute', left: 20, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next image"
        style={{ position: 'absolute', right: 70, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div style={{ maxWidth: '90vw', maxHeight: '85vh', width: 'min(1100px, 90vw)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <img
          src={activeImage.url}
          alt="Product media preview"
          style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: 12, objectFit: 'contain', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
        />
        <div style={{ color: '#f3f4f6', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}
