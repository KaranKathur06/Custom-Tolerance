"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCapability, formatLeadTime, formatMarketplaceValue, formatPrice } from '@/lib/marketplace/display';
import {
  ArrowRight, Award, Box, MapPin, ShieldCheck, Zap,
} from 'lucide-react';

type SellerProduct = {
  id: string;
  product_name: string;
  capability?: string;
  materials?: string[];
  moq?: string;
  lead_time?: string;
  estimated_price_per_unit?: number | null;
  quantity_available?: number;
  certifications?: string[];
  is_featured?: boolean;
  is_published?: boolean;
  approval_status?: string;
  published_at?: string;
  featured_image?: { url: string; alt?: string | null } | null;
  seller_profile?: {
    id?: string;
    companyName?: string;
    location?: string;
    isVerified?: boolean;
    rating?: number;
  };
};

export default function ProductCard({ item }: { item: SellerProduct }) {
  const [imageFailed, setImageFailed] = useState(false);
  const seller = item.seller_profile || {};
  const isFeatured = item.is_featured;
  const imageUrl = item.featured_image?.url;

  return (
    <Link href={`/products/${item.id}`} className="block">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {imageUrl && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={item.featured_image?.alt || item.product_name} className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]" onError={() => setImageFailed(true)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#e2e8f0_25%,#cbd5e1_25%,#cbd5e1_50%,#e2e8f0_50%,#e2e8f0_75%,#cbd5e1_75%)] bg-[length:24px_24px] text-slate-500">
              <Box className="h-9 w-9" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">Product image pending</span>
            </div>
          )}
          {isFeatured ? <Badge className="absolute left-4 top-4 bg-amber-500 text-white"><Zap className="mr-1 h-3 w-3" /> Featured</Badge> : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {seller.isVerified ? <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified Supplier</span> : null}
              {item.capability ? <span className="truncate">{formatCapability(item.capability)}</span> : null}
            </div>
            <h3 className="line-clamp-2 text-lg font-bold leading-tight text-slate-900 group-hover:text-blue-700">
              {item.product_name}
            </h3>
          </div>

          <div className="border-y border-slate-100 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">{seller.companyName || 'Supplier'}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {seller.location || 'Location not provided'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 p-2.5"><span className="block text-slate-400">MOQ</span><strong className="text-slate-800">{formatMarketplaceValue(item.moq)}</strong></div>
            <div className="rounded-md bg-slate-50 p-2.5"><span className="block text-slate-400">Lead time</span><strong className="text-slate-800">{formatLeadTime(item.lead_time)}</strong></div>
          </div>

          {/* Materials */}
          {item.materials && item.materials.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.materials.slice(0, 3).map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {m}
                </Badge>
              ))}
              {item.materials.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{item.materials.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Certifications */}
          {item.certifications && item.certifications.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Award className="h-3.5 w-3.5 text-blue-600" />
              <span>{item.certifications.join(', ')}</span>
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Price</p><p className="mt-1 text-sm font-bold text-slate-900">{formatPrice(item.estimated_price_per_unit)}</p></div>
            <span className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-blue-800">View Product <ArrowRight className="h-4 w-4" /></span>
          </div>
        </div>
      </article>
    </Link>
  );
}
