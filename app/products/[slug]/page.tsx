import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPublicDetail } from "@/components/marketplace/public/ListingPublicDetail";
import { loadListingBySlug, loadListingCompany } from "@/lib/marketplace/listing-detail";
import { buildListingSchema, buildSeoMetadata } from "@/lib/marketplace/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await loadListingBySlug(slug);
  if (!listing) return { title: "Product Not Found | CustomTolerance" };

  return buildSeoMetadata({
    title: listing.seo_title || `${listing.title} | CustomTolerance`,
    description: listing.seo_description || listing.description || "Industrial product listing on CustomTolerance.",
    canonicalPath: `/products/${listing.slug}`,
    imageUrl: listing.product?.media[0]?.url ?? null,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const listing = await loadListingBySlug(slug);
  if (!listing) notFound();

  const company = await loadListingCompany(listing.company_id);
  const product = listing.product;
  const schema = buildListingSchema({
    name: product?.title ?? listing.title,
    description: product?.description ?? listing.description,
    url: `/products/${listing.slug}`,
    imageUrl: product?.media[0]?.url ?? null,
    sellerName: company?.name ?? "CustomTolerance supplier",
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ListingPublicDetail
        listing={listing}
        company={company}
        backHref="/marketplace"
        backLabel="Marketplace"
      />
    </>
  );
}
