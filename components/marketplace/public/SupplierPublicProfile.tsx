import Link from "next/link";
import {
    ArrowLeft,
    Building2,
    Factory,
    Package,
    ShieldCheck,
    TrendingUp,
} from "lucide-react";
import type { MarketplaceSupplier } from "@/lib/marketplace/supplier-query";
import type { SupplierIdentityTrust } from "@/lib/marketplace/supplier-identity";
import type { SupplierExtendedProfile } from "@/lib/marketplace/supplier-profile-extended";
import { SupplierProfileHero } from "@/components/marketplace/public/SupplierProfileHero";
import { SupplierStickyNav } from "@/components/marketplace/public/SupplierStickyNav";
import { SupplierTechnicalGrid } from "@/components/marketplace/public/SupplierTechnicalGrid";
import { SupplierListingCards } from "@/components/marketplace/public/SupplierListingCards";
import { SupplierGallery } from "@/components/marketplace/public/SupplierGallery";
import { SupplierCertificationsDisplay } from "@/components/marketplace/public/SupplierCertificationsDisplay";
import { SupplierReviews } from "@/components/marketplace/public/SupplierReviews";
import { SupplierTrustBlock } from "@/components/marketplace/public/SupplierTrustBlock";
import { RelatedSuppliersCarousel } from "@/components/marketplace/public/RelatedSuppliersCarousel";

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

const PROFILE_SECTIONS = [
    { id: "about", label: "About" },
    { id: "capabilities", label: "Capabilities" },
    { id: "certifications", label: "Certifications" },
    { id: "gallery", label: "Gallery" },
    { id: "technical", label: "Technical" },
    { id: "products", label: "Products" },
    { id: "reviews", label: "Reviews" },
    { id: "related", label: "Related" },
];

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

    // Filter out sections without content
    const activeSections = PROFILE_SECTIONS.filter((s) => {
        if (s.id === "gallery" && (!extended?.gallery || extended.gallery.length === 0)) return false;
        if (s.id === "products" && listings.length === 0 && supplier.products.length === 0) return false;
        if (s.id === "reviews" && !extended) return false;
        if (s.id === "related" && relatedSuppliers.length === 0) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-[hsl(var(--ct-bg))]">
            {/* Breadcrumb */}
            <div className="border-b border-slate-200 bg-white">
                <div className="container py-3">
                    <Link
                        href="/marketplace?type=suppliers"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-ct-gold hover:text-ct-gold-light transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Suppliers
                    </Link>
                </div>
            </div>

            {/* Premium Hero */}
            <SupplierProfileHero
                supplierId={supplier.id}
                supplierSlug={supplier.slug}
                companyName={supplier.company_name}
                locationLabel={locationLabel}
                logoUrl={supplier.logo_url}
                coverImageUrl={coverImage}
                foundingYear={foundingYear}
                employeeCount={employeeCount}
                isGstVerified={isGstVerified}
                isVerified={supplier.verification_status === "verified"}
                exportCapability={supplier.export_capability}
                reviewAvg={extended?.review_avg}
                reviewCount={extended?.review_count ?? 0}
                verifiedOrderCount={extended?.verified_order_count}
                isSaved={extended?.isSaved}
            />

            {/* Sticky Nav */}
            <SupplierStickyNav sections={activeSections} />

            {/* Content */}
            <div className="container py-8">
                <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
                    {/* Main content */}
                    <div className="space-y-8">
                        {/* About */}
                        <ProfileSection
                            id="about"
                            title="About Company"
                            icon={<Building2 className="h-5 w-5" />}
                        >
                            <p className="text-sm leading-relaxed text-slate-600">
                                {supplier.short_description || "Company description will be updated soon."}
                            </p>
                        </ProfileSection>

                        {/* Capabilities */}
                        <ProfileSection
                            id="capabilities"
                            title="Capabilities"
                            icon={<ShieldCheck className="h-5 w-5" />}
                        >
                            {supplier.capabilities.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {supplier.capabilities.map((cap) => (
                                        <Link
                                            key={cap.slug}
                                            href={`/capabilities/${cap.slug}`}
                                            className="ct-capability-tag"
                                        >
                                            {cap.name}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    Capability details will be updated soon.
                                </p>
                            )}
                        </ProfileSection>

                        {/* Industries */}
                        {supplier.industries.length > 0 && (
                            <ProfileSection
                                id="industries"
                                title="Industries Served"
                                icon={<TrendingUp className="h-5 w-5" />}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {supplier.industries.map((ind) => (
                                        <Link
                                            key={ind.slug}
                                            href={`/industries/${ind.slug}`}
                                            className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100"
                                        >
                                            {ind.name}
                                        </Link>
                                    ))}
                                </div>
                            </ProfileSection>
                        )}

                        {/* Technical Details */}
                        <ProfileSection
                            id="technical"
                            title="Technical Details"
                            icon={<Package className="h-5 w-5" />}
                        >
                            <SupplierTechnicalGrid
                                moq={supplier.moq}
                                leadTime={extended?.lead_time_range ?? supplier.avg_response_time}
                                exportCapability={supplier.export_capability}
                                paymentTerms={extended?.payment_terms}
                                productionCapacity={supplier.production_capacity}
                                priceRange={supplier.price_range}
                            />
                        </ProfileSection>

                        {/* Certifications */}
                        <ProfileSection
                            id="certifications"
                            title="Certifications"
                            icon={<ShieldCheck className="h-5 w-5" />}
                        >
                            {extended?.certifications?.length ? (
                                <SupplierCertificationsDisplay
                                    certifications={extended.certifications}
                                />
                            ) : (
                                <p className="text-sm text-slate-500">
                                    Certification details coming soon.
                                </p>
                            )}
                        </ProfileSection>

                        {/* Gallery */}
                        {extended?.gallery && extended.gallery.length > 0 && (
                            <ProfileSection
                                id="gallery"
                                title="Facility Gallery"
                                icon={<Factory className="h-5 w-5" />}
                            >
                                <SupplierGallery images={extended.gallery} />
                            </ProfileSection>
                        )}

                        {/* Product Listings */}
                        {listings.length > 0 && (
                            <ProfileSection
                                id="products"
                                title="Product Listings"
                                icon={<Package className="h-5 w-5" />}
                            >
                                <SupplierListingCards listings={listings} />
                            </ProfileSection>
                        )}

                        {/* Products & Materials */}
                        {supplier.products.length > 0 && (
                            <ProfileSection
                                id="materials"
                                title="Products & Materials"
                                icon={<Package className="h-5 w-5" />}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {supplier.products.map((prod) => (
                                        <Link
                                            key={prod.slug}
                                            href={`/products/${prod.slug}`}
                                            className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100"
                                        >
                                            {prod.name}
                                        </Link>
                                    ))}
                                </div>
                            </ProfileSection>
                        )}

                        {/* Reviews */}
                        {extended && (
                            <ProfileSection
                                id="reviews"
                                title="Reviews"
                                icon={<TrendingUp className="h-5 w-5" />}
                            >
                                <SupplierReviews
                                    supplierId={supplier.id}
                                    supplierSlug={supplier.slug}
                                    reviewStats={extended.reviewStats}
                                    initialReviews={extended.reviews}
                                    initialTotal={extended.reviewStats?.total_count ?? 0}
                                />
                            </ProfileSection>
                        )}

                        {/* Related Suppliers */}
                        {relatedSuppliers.length > 0 && (
                            <section id="related" className="scroll-mt-24">
                                <h2 className="ct-section-title mb-6">
                                    You may also like
                                </h2>
                                <RelatedSuppliersCarousel suppliers={relatedSuppliers} />
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
                        {/* Trust block */}
                        {extended && (
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
                        )}

                        {/* Profile strength */}
                        <div className="ct-card p-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Profile Strength
                            </h4>
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Completeness</span>
                                    <span className="font-bold text-ct-navy">
                                        {profileStrength}%
                                    </span>
                                </div>
                                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${profileStrength}%`,
                                            background:
                                                profileStrength >= 80
                                                    ? "linear-gradient(90deg, #16A34A, #22C55E)"
                                                    : profileStrength >= 50
                                                    ? "linear-gradient(90deg, #C68A2D, #D4A853)"
                                                    : "linear-gradient(90deg, #EF4444, #F87171)",
                                        }}
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

/* ─── Section wrapper ─── */
function ProfileSection({
    id,
    title,
    icon,
    children,
}: {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="ct-card scroll-mt-24 p-6">
            <h2 className="flex items-center gap-2.5 font-outfit text-xl font-bold text-ct-navy">
                <span className="text-ct-gold">{icon}</span>
                {title}
            </h2>
            <div className="mt-5">{children}</div>
        </section>
    );
}
