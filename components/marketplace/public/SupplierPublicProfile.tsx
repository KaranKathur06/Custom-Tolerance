import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    Factory,
    Globe2,
    MapPin,
    Package,
    ShieldCheck,
    TrendingUp,
    Users,
    Calendar,
} from "lucide-react";
import { SupplierCard } from "@/components/marketplace/SupplierCard";
import type { MarketplaceSupplier } from "@/lib/marketplace/supplier-query";
import type { SupplierIdentityTrust } from "@/lib/marketplace/supplier-identity";
import type { SupplierExtendedProfile } from "@/lib/marketplace/supplier-profile-extended";
import { SupplierListingCards } from "@/components/marketplace/public/SupplierListingCards";
import { SupplierGallery } from "@/components/marketplace/public/SupplierGallery";
import { SupplierCertificationsDisplay } from "@/components/marketplace/public/SupplierCertificationsDisplay";
import { SupplierReviews } from "@/components/marketplace/public/SupplierReviews";
import { SupplierProfileCta } from "@/components/marketplace/public/SupplierProfileCta";
import { SupplierTrustBlock } from "@/components/marketplace/public/SupplierTrustBlock";

type SupplierListingPreview = {
    id: string;
    title: string;
    slug: string;
    metal_type: string | null;
    price_min: number | null;
    price_max: number | null;
    moq: string | null;
    is_featured: boolean | null;
};

type SupplierPublicProfileProps = {
    supplier: MarketplaceSupplier & Partial<SupplierIdentityTrust>;
    relatedSuppliers: MarketplaceSupplier[];
    profileStrength: number;
    listings?: SupplierListingPreview[];
    extended?: SupplierExtendedProfile;
};

export function SupplierPublicProfile({
    supplier,
    relatedSuppliers,
    profileStrength,
    listings = [],
    extended,
}: SupplierPublicProfileProps) {
    const locationLabel = [supplier.city, supplier.state, supplier.country]
        .filter(Boolean)
        .join(", ");

    const coverImage = extended?.cover_image_url ?? supplier.banner_url;
    const foundingYear = extended?.founding_year ?? supplier.years_in_business;
    const employeeCount = extended?.employee_count;
    const isGstVerified = Boolean(extended?.gst_verified_at);

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="border-b border-slate-200 bg-white">
                <div className="container py-3">
                    <Link
                        href="/marketplace?type=suppliers"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Suppliers
                    </Link>
                </div>
            </div>

            {/* Cover + Hero */}
            <section className="relative overflow-hidden border-b border-slate-200">
                <div className="relative h-48 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 md:h-56">
                    {coverImage ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverImage}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover opacity-40"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        </>
                    ) : null}
                </div>

                <div className="container relative z-10 -mt-16 pb-8">
                    <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="flex min-w-0 flex-1 gap-5">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
                                {supplier.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={supplier.logo_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Factory className="h-10 w-10 text-slate-400" />
                                )}
                            </div>
                            <div className="min-w-0 pb-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    {isGstVerified ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            GST Verified
                                        </span>
                                    ) : supplier.verification_status === "verified" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-400/30">
                                            Verified Supplier
                                        </span>
                                    ) : null}
                                    {supplier.export_capability ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                            <Globe2 className="h-3.5 w-3.5" />
                                            Export
                                        </span>
                                    ) : null}
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">
                                    {supplier.company_name}
                                </h1>
                                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {locationLabel}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                                    {foundingYear ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Est. {foundingYear}
                                        </span>
                                    ) : null}
                                    {employeeCount ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {employeeCount}+ employees
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container py-8">
                <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-6">
                        <Section title="About company" icon={<Building2 className="h-5 w-5" />}>
                            <p className="text-sm leading-relaxed text-slate-600">
                                {supplier.short_description}
                            </p>
                        </Section>

                        <Section title="Capabilities" icon={<ShieldCheck className="h-5 w-5" />}>
                            <CapabilityFacetList items={supplier.capabilities} />
                        </Section>

                        <Section title="Industries served" icon={<TrendingUp className="h-5 w-5" />}>
                            <FacetList items={supplier.industries} hrefPrefix="/industries" />
                        </Section>

                        <Section title="Commercial information" icon={<Package className="h-5 w-5" />}>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <MiniStat label="MOQ" value={supplier.moq ?? "On request"} />
                                <MiniStat
                                    label="Lead time"
                                    value={extended?.lead_time_range ?? supplier.avg_response_time ?? "On request"}
                                />
                                <MiniStat
                                    label="Payment terms"
                                    value={extended?.payment_terms ?? "On request"}
                                />
                                <MiniStat
                                    label="Export capability"
                                    value={supplier.export_capability ? "Yes" : "Domestic only"}
                                />
                                <MiniStat
                                    label="Production capacity"
                                    value={supplier.production_capacity ?? "On request"}
                                />
                                <MiniStat label="Price range" value={supplier.price_range ?? "On request"} />
                            </div>
                        </Section>

                        {extended?.gallery && extended.gallery.length > 0 ? (
                            <Section title="Facility gallery" icon={<Factory className="h-5 w-5" />}>
                                <SupplierGallery images={extended.gallery} />
                            </Section>
                        ) : null}

                        <Section title="Certifications" icon={<ShieldCheck className="h-5 w-5" />}>
                            {extended?.certifications?.length ? (
                                <SupplierCertificationsDisplay certifications={extended.certifications} />
                            ) : (
                                <p className="text-sm text-slate-500">Certification details coming soon.</p>
                            )}
                        </Section>

                        {listings.length > 0 ? (
                            <Section title="Product listings" icon={<Package className="h-5 w-5" />}>
                                <SupplierListingCards listings={listings} />
                            </Section>
                        ) : null}

                        <Section title="Products & materials" icon={<Package className="h-5 w-5" />}>
                            <FacetList items={supplier.products} hrefPrefix="/products" />
                        </Section>

                        {extended ? (
                            <Section title="Reviews" icon={<TrendingUp className="h-5 w-5" />}>
                                <SupplierReviews
                                    supplierId={supplier.id}
                                    supplierSlug={supplier.slug}
                                    reviewStats={extended.reviewStats}
                                    initialReviews={extended.reviews}
                                    initialTotal={extended.reviewStats?.total_count ?? 0}
                                />
                            </Section>
                        ) : null}

                        {relatedSuppliers.length > 0 ? (
                            <Section title="Related suppliers" icon={<Factory className="h-5 w-5" />}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {relatedSuppliers.map((related) => (
                                        <SupplierCard key={related.id} supplier={related} />
                                    ))}
                                </div>
                            </Section>
                        ) : null}
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
                        <SupplierProfileCta
                            supplierId={supplier.id}
                            supplierSlug={supplier.slug}
                            supplierName={supplier.company_name}
                            isSaved={extended?.isSaved}
                            recentActivity={supplier.recent_activity}
                        />

                        {extended ? (
                            <SupplierTrustBlock
                                reviewAvg={extended.review_avg}
                                reviewCount={extended.review_count}
                                verifiedOrderCount={extended.verified_order_count}
                                responseRate={supplier.response_rate}
                                avgQuoteTime={extended.avg_quote_time}
                                memberSince={extended.member_since}
                                gstVerifiedAt={extended.gst_verified_at}
                                gstLegalName={extended.gst_legal_name}
                                gstVerification={extended.gstVerification}
                                verificationStatus={supplier.verification_status}
                            />
                        ) : null}

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                                Profile strength
                            </h4>
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Completeness</span>
                                    <span className="font-bold text-slate-900">{profileStrength}%</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-blue-600 transition-all"
                                        style={{ width: `${profileStrength}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function Section({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <span className="text-blue-600">{icon}</span>
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function CapabilityFacetList({
    items,
}: {
    items: Array<{ name: string; slug: string }>;
}) {
    if (!items.length) {
        return <p className="text-sm text-slate-500">Details will be updated soon.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <Link
                    key={item.slug}
                    href={`/capabilities/${item.slug}`}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                    {item.name}
                </Link>
            ))}
        </div>
    );
}

function FacetList({
    items,
    hrefPrefix,
}: {
    items: Array<{ name: string; slug: string }>;
    hrefPrefix: string;
}) {
    if (!items.length) {
        return <p className="text-sm text-slate-500">Details will be updated soon.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <Link
                    key={item.slug}
                    href={`${hrefPrefix}/${item.slug}`}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                    {item.name}
                </Link>
            ))}
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
        </div>
    );
}
