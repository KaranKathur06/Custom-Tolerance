import Link from "next/link";
import { Building2, CheckCircle, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDisplayValue, formatLeadTime, formatPriceUnit } from "@/lib/product/display";
import { ProductGallery } from "./ProductGallery";
import type { ListingCompany, PublicListing, PublicProductDetail, ProductSpecification } from "@/lib/marketplace/listing-detail";

type ListingPublicDetailProps = {
  listing: PublicListing;
  company: ListingCompany | null;
  backHref?: string;
  backLabel?: string;
};

export function ListingPublicDetail({
  listing,
  company,
  backHref = "/marketplace",
  backLabel = "Marketplace",
}: ListingPublicDetailProps) {
  const product = listing.product;
  const isVerified = company?.verification_status === "approved";
  const supplierHref = company?.slug ? `/suppliers/${company.slug}` : company?.marketplace_supplier_id ? `/suppliers/${company.marketplace_supplier_id}` : null;
  const title = product?.title ?? listing.title;
  const description = product?.description ?? listing.description;
  const media = product?.media ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="container flex items-center gap-2 py-3 text-sm text-slate-500">
          <Link href={backHref} className="hover:text-primary">{backLabel}</Link><span>/</span><span className="truncate font-medium text-slate-900">{title}</span>
        </div>
      </div>

      <main className="container space-y-8 py-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <ProductGallery media={media} title={title} />
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {(product?.category ?? listing.metal_type) ? <Badge variant="secondary">{product?.category ?? formatDisplayValue(listing.metal_type)}</Badge> : null}
              {listing.is_featured ? <Badge className="bg-amber-500 text-white">Featured</Badge> : null}
              {isVerified ? <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle className="h-3 w-3" /> Verified supplier</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            {product?.technical.grades.length ? <p className="mt-2 text-sm text-slate-500">Grades: {product.technical.grades.join(", ")}</p> : listing.grade ? <p className="mt-2 text-sm text-slate-500">Grade: {listing.grade}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-5">
              <Summary label="Minimum order" value={product?.manufacturing.minimumOrderQuantity ?? listing.moq} />
              <Summary label="Lead time" value={product?.manufacturing.leadTime ?? formatLeadTime(listing.lead_time)} />
              <Summary label="Production capacity" value={product?.manufacturing.productionCapacity ? `${product.manufacturing.productionCapacity} ${product.manufacturing.productionCapacityUnit ?? ""}` : listing.production_capacity} />
              <Summary label="Availability" value="Active listing" />
            </div>
            {product?.commercial.minPrice != null || listing.price_min != null ? <p className="mt-5 text-2xl font-bold text-slate-950">{formatCurrency(product?.commercial.minPrice ?? listing.price_min ?? 0)}{product?.commercial.maxPrice != null && product.commercial.maxPrice !== product.commercial.minPrice ? ` - ${formatCurrency(product.commercial.maxPrice)}` : listing.price_max != null && listing.price_max !== listing.price_min ? ` - ${formatCurrency(listing.price_max)}` : ""}<span className="ml-1 text-sm font-medium text-slate-500">{product?.commercial.priceUnit ?? (listing.price_unit ? formatPriceUnit(listing.price_unit) : "")}</span></p> : <p className="mt-5 text-sm font-medium text-slate-500">Pricing available on inquiry</p>}
            <div className="mt-auto pt-6"><Link href={`/post-requirement?listing=${listing.id}`}><Button className="h-12 w-full rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800"><MessageSquare className="mr-2 h-5 w-5" /> Send inquiry</Button></Link></div>
          </div>
        </section>

        {description ? <Section title="Product overview"><p className="whitespace-pre-line leading-7 text-slate-600">{description}</p></Section> : null}
        {product ? <ProductSections product={product} listing={listing} /> : <LegacySections listing={listing} />}

        {company ? <Section title="Supplier"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"><Building2 className="h-6 w-6 text-slate-500" /></div><div><p className="font-bold text-slate-900">{company.name}</p>{isVerified ? <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Shield className="h-3 w-3" /> Verified business</p> : null}</div></div>{supplierHref ? <Link href={supplierHref}><Button variant="outline">View supplier profile</Button></Link> : null}</div></Section> : null}
      </main>
    </div>
  );
}

function ProductSections({ product, listing }: { product: PublicProductDetail; listing: PublicListing }) {
  const technical = [...product.technical.dimensions, ...product.technical.weight];
  const materials = [...product.technical.materials, ...product.technical.grades];
  const commercial = product.commercial;
  return <>
    {product.technical.capabilities.length || product.technical.industries.length || product.technical.specification || product.technical.tolerance || technical.length || product.technical.qualityCertificate ? <Section title="Technical specifications"><SpecGrid items={[{ label: "Capabilities", value: product.technical.capabilities.join(", ") }, { label: "Industries", value: product.technical.industries.join(", ") }, { label: "Product standard", value: product.technical.specification }, { label: "Tolerance", value: product.technical.tolerance }, { label: "Quality certificate", value: product.technical.qualityCertificate }, ...technical]} /></Section> : null}
    {materials.length ? <Section title="Materials & grades"><div className="grid gap-3 sm:grid-cols-2">{materials.map((value, index) => <div key={`${value}-${index}`} className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">{value}</div>)}</div></Section> : null}
    {product.manufacturing.productionCapacity || product.manufacturing.minimumOrderQuantity || product.manufacturing.leadTime || product.manufacturing.inspection || product.technical.tooling.length ? <Section title="Manufacturing"><SpecGrid items={[{ label: "Production capacity", value: product.manufacturing.productionCapacity ? `${product.manufacturing.productionCapacity} ${product.manufacturing.productionCapacityUnit ?? ""}` : null }, { label: "Minimum order", value: product.manufacturing.minimumOrderQuantity }, { label: "Lead time", value: product.manufacturing.leadTime }, { label: "Inspection", value: product.manufacturing.inspection }, ...product.technical.tooling]} /></Section> : null}
    {product.packaging.shippingType || product.packaging.primary || product.packaging.secondary || product.packaging.notes ? <Section title="Packaging & delivery"><SpecGrid items={[{ label: "Shipping type", value: product.packaging.shippingType }, { label: "Primary packaging", value: product.packaging.primary }, { label: "Secondary packaging", value: product.packaging.secondary }, { label: "Packaging notes", value: product.packaging.notes }, { label: "Delivery terms", value: commercial.deliveryTerms }, { label: "Incoterms", value: commercial.incoterms.join(", ") }]} /></Section> : null}
    {commercial.priceType || commercial.currency || commercial.paymentTerms.length || commercial.freeSample || commercial.sampleShippingCost ? <Section title="Commercial information"><SpecGrid items={[{ label: "Pricing model", value: commercial.priceType?.replace(/_/g, " ") }, { label: "Currency", value: commercial.currency }, { label: "Price unit", value: commercial.priceUnit }, { label: "Payment terms", value: commercial.paymentTerms.join(", ") }, { label: "Free sample", value: commercial.freeSample }, { label: "Sample shipping", value: commercial.sampleShippingCost }]} /></Section> : null}
    {listing.certifications?.length ? <Section title="Quality & certifications"><div className="flex flex-wrap gap-2">{listing.certifications.map((cert) => <Badge key={cert} variant="outline">{cert}</Badge>)}</div></Section> : null}
  </>;
}

function LegacySections({ listing }: { listing: PublicListing }) {
  return <>{listing.material_spec || listing.moq || listing.lead_time || listing.production_capacity ? <Section title="Specifications"><SpecGrid items={[{ label: "Material", value: listing.material_spec }, { label: "Minimum order", value: listing.moq }, { label: "Lead time", value: listing.lead_time }, { label: "Production capacity", value: listing.production_capacity }]} /></Section> : null}{listing.certifications?.length ? <Section title="Quality & certifications"><div className="flex flex-wrap gap-2">{listing.certifications.map((cert) => <Badge key={cert} variant="outline">{cert}</Badge>)}</div></Section> : null}</>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold text-slate-950">{title}</h2>{children}</section>;
}

function SpecGrid({ items }: { items: Array<ProductSpecification | { label: string; value: string | null | undefined }> }) {
  const visible = items.filter((item) => typeof item.value === "string" && item.value.trim());
  if (!visible.length) return null;
  return <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{visible.map((item) => <div key={item.label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p><p className="mt-1 text-sm font-medium text-slate-800">{item.value}</p></div>)}</div>;
}

function Summary({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value?.trim() || "Not specified"}</p></div>;
}
