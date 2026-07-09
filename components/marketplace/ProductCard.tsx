import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowRight, Award, CheckCircle2, Factory, Globe2, MapPin, Package,
  Shield, ShieldCheck, Star, Zap,
} from 'lucide-react';

type SellerProduct = {
  id: string;
  product_name: string;
  capability?: string;
  materials?: string[];
  moq?: string;
  lead_time?: string;
  estimated_price_per_unit?: number;
  quantity_available?: number;
  certifications?: string[];
  is_featured?: boolean;
  is_published?: boolean;
  approval_status?: string;
  published_at?: string;
  seller_profile?: {
    id?: string;
    companyName?: string;
    location?: string;
    isVerified?: boolean;
    rating?: number;
  };
};

export default function ProductCard({ item }: { item: SellerProduct }) {
  const seller = item.seller_profile || {};
  const isFeatured = item.is_featured;
  const priceDisplay = item.estimated_price_per_unit
    ? `$${item.estimated_price_per_unit.toFixed(2)}/unit`
    : 'Price on Request';

  return (
    <Link href={`/products/${item.id}`} className="block">
      <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Featured badge */}
        {isFeatured && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-amber-500 text-white shadow-md hover:bg-amber-600">
              <Zap className="mr-1 h-3 w-3" /> Featured
            </Badge>
          </div>
        )}

        <div className="flex flex-col gap-4 p-5">
          {/* Product name */}
          <div>
            <h3 className="line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-blue-600">
              {item.product_name}
            </h3>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.capability}</p>
          </div>

          {/* Seller info */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-600">{seller.companyName}</p>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {seller.location || 'Location unavailable'}
              </div>
            </div>
            {seller.isVerified && (
              <div title="Verified supplier">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="space-y-2">
            {item.moq && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">MOQ:</span>
                <span className="font-semibold text-slate-900">{item.moq}</span>
              </div>
            )}
            {item.lead_time && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Lead Time:</span>
                <span className="font-semibold text-slate-900">{item.lead_time}</span>
              </div>
            )}
            {item.quantity_available && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Available:</span>
                <span className="font-semibold text-slate-900">{item.quantity_available.toLocaleString()} units</span>
              </div>
            )}
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

          {/* Price */}
          <div className="rounded-lg border border-slate-100 bg-blue-50 px-3 py-2">
            <p className="text-center text-sm font-bold text-blue-900">{priceDisplay}</p>
          </div>

          {/* CTA */}
          <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800">
            View Product <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Verification badge */}
        {seller.isVerified && (
          <div className="absolute bottom-4 left-4 hidden gap-1.5 text-xs text-emerald-700 group-hover:flex">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </div>
        )}
      </article>
    </Link>
  );
}
