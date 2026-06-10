import { BRAND } from '@/config/brand';
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SupplierPublicProfile } from "@/components/marketplace/public/SupplierPublicProfile";
import { buildSeoMetadata, buildSupplierSchema } from "@/lib/marketplace/seo";
import {
    computeProfileCompleteness,
    loadRelatedSuppliers,
    loadSupplierPublicProfile,
} from "@/lib/marketplace/public-entities";
import { loadSupplierExtendedProfile } from "@/lib/marketplace/supplier-profile-extended";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { resolveSlugRedirect } from "@/lib/marketplace/slug-redirect";
import { enrichSupplierWithIdentityTrust } from "@/lib/marketplace/supplier-identity";
import { loadSupplierListings } from "@/lib/marketplace/listing-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supplier = await loadSupplierPublicProfile(slug);
    if (!supplier) return { title: "Supplier Not Found | CustomTolerance" };

    const location = [supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ");

    return buildSeoMetadata({
        title: `${supplier.company_name} | Industrial Supplier | ${BRAND.name}`,
        description:
            supplier.short_description ??
            `${supplier.company_name} — verified metal manufacturing supplier in ${location}. View capabilities, certifications, and request a quote.`,
        canonicalPath: `/suppliers/${supplier.slug}`,
        imageUrl: supplier.logo_url ?? supplier.banner_url,
    });
}

export default async function SupplierProfilePage({ params }: Props) {
    const { slug } = await params;
    const supabase = createSupabaseServerClient();

    if (supabase) {
        const redirectInfo = await resolveSlugRedirect(supabase, "supplier", slug);
        if (redirectInfo) {
            redirect(redirectInfo.redirectPath);
        }
    }

    const baseSupplier = await loadSupplierPublicProfile(slug);
    if (!baseSupplier) notFound();

    const supplier =
        supabase != null
            ? await enrichSupplierWithIdentityTrust(supabase, baseSupplier)
            : baseSupplier;

    const relatedSuppliers = await loadRelatedSuppliers(supplier);
    const profileStrength = computeProfileCompleteness(supplier);

    let supplierListings: Awaited<ReturnType<typeof loadSupplierListings>> = [];
    let extended: Awaited<ReturnType<typeof loadSupplierExtendedProfile>> | undefined;

    if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        const [{ data: bridge }, ext] = await Promise.all([
            supabase
                .from("suppliers")
                .select("company_id, seller_profile_id")
                .eq("id", supplier.id)
                .maybeSingle(),
            loadSupplierExtendedProfile(supabase, supplier.id, user?.id ?? null),
        ]);

        extended = ext;

        supplierListings = await loadSupplierListings({
            companyId: bridge?.company_id,
            sellerProfileId: bridge?.seller_profile_id,
            limit: 8,
        });
    }

    const location = [supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ");
    const schema = buildSupplierSchema({
        name: supplier.company_name,
        description: supplier.short_description,
        url: `/suppliers/${supplier.slug}`,
        imageUrl: supplier.logo_url,
        coverImageUrl: extended?.cover_image_url ?? supplier.banner_url,
        locationLabel: location,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        certifications: (extended?.certifications ?? supplier.certifications).map((c) => c.name),
        capabilities: supplier.capabilities.map((c) => c.name),
        reviewAvg: extended?.review_avg ?? null,
        reviewCount: extended?.review_count ?? 0,
        gstVerified: Boolean(extended?.gst_verified_at),
        foundingYear: extended?.founding_year ?? null,
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
            <SupplierPublicProfile
                supplier={supplier}
                relatedSuppliers={relatedSuppliers}
                profileStrength={profileStrength}
                listings={supplierListings}
                extended={extended}
            />
        </>
    );
}
