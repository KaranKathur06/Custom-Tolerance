import Link from "next/link";
import { Building2, CheckCircle, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  formatBooleanField,
  formatCapability,
  formatDisplayValue,
  formatGrade,
  formatIncoterms,
  formatIndustry,
  formatLeadTime,
  formatList,
  formatPackaging,
  formatPaymentTerms,
  formatPrecision,
  formatPriceType,
  formatPriceUnit,
  formatShippingType,
  formatSpecification,
  formatUnit,
} from "@/lib/product/display";
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
              {(product?.category ?? listing.metal_type) ? <Badge variant="secondary" className="max-w-full whitespace-normal break-words">{formatCapability(product?.category ?? listing.metal_type)}</Badge> : null}
              {listing.is_featured ? <Badge className="bg-amber-500 text-white">Featured</Badge> : null}
              {isVerified ? <Badge className="gap-1 bg-emerald-600 text-white"><CheckCircle className="h-3 w-3" /> Verified supplier</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            {product?.technical.grades.length ? <p className="mt-2 break-words text-sm text-slate-500">Grades: {formatList(product.technical.grades, formatGrade).join(", ")}</p> : listing.grade ? <p className="mt-2 break-words text-sm text-slate-500">Grade: {formatGrade(listing.grade)}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-5">
              <Summary label="Minimum Order Quantity" value={product?.manufacturing.minimumOrderQuantity ?? listing.moq} />
              <Summary label="Lead Time" value={product?.manufacturing.leadTime || listing.lead_time ? formatLeadTime(product?.manufacturing.leadTime ?? listing.lead_time) : null} />
              <Summary label="Monthly Production Capacity" value={product?.manufacturing.productionCapacity ? `${product.manufacturing.productionCapacity} ${product.manufacturing.productionCapacityUnit ? formatUnit(product.manufacturing.productionCapacityUnit) : ""}` : listing.production_capacity} />
              <Summary label="Availability" value="Active listing" />
            </div>
            {product?.commercial.minPrice != null || listing.price_min != null ? <p className="mt-5 break-words text-2xl font-bold text-slate-950">{formatCurrency(product?.commercial.minPrice ?? listing.price_min ?? 0)}{product?.commercial.maxPrice != null && product.commercial.maxPrice !== product.commercial.minPrice ? ` - ${formatCurrency(product.commercial.maxPrice)}` : listing.price_max != null && listing.price_max !== listing.price_min ? ` - ${formatCurrency(listing.price_max)}` : ""}<span className="ml-1 text-sm font-medium text-slate-500">{product?.commercial.priceUnit ? formatPriceUnit(product.commercial.priceUnit) : listing.price_unit ? formatPriceUnit(listing.price_unit) : ""}</span></p> : <p className="mt-5 break-words text-sm font-medium text-slate-500">{product?.commercial.priceType ? formatPriceType(product.commercial.priceType) : "Pricing available on inquiry"}</p>}
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
  const capabilities = formatList(product.technical.capabilities, formatCapability);
  const industries = formatList(product.technical.industries, formatIndustry);
  const paymentTerms = formatPaymentTerms(commercial.paymentTerms);
  const incoterms = formatIncoterms(commercial.incoterms);
  const technicalItems = [
    {
      label: "Product Standard",
      value: product.technical.specification
        ? formatSpecification(product.technical.specification)
        : null,
    },
    {
      label: "Tolerance",
      value: product.technical.tolerance
        ? formatPrecision(product.technical.tolerance)
        : null,
    },
    {
      label: "Quality Certificate",
      value: product.technical.qualityCertificate
        ? formatSpecification(product.technical.qualityCertificate)
        : null,
    },
    ...technical,
  ];
  const manufacturingItems = [
    {
      label: "Monthly Production Capacity",
      value: product.manufacturing.productionCapacity
        ? `${product.manufacturing.productionCapacity} ${
            product.manufacturing.productionCapacityUnit
              ? formatUnit(product.manufacturing.productionCapacityUnit)
              : ""
          }`
        : null,
    },
    {
      label: "Minimum Order Quantity",
      value: product.manufacturing.minimumOrderQuantity,
    },
    {
      label: "Lead Time",
      value: product.manufacturing.leadTime
        ? formatLeadTime(product.manufacturing.leadTime)
        : null,
    },
    {
      label: "Third-Party Inspection",
      value:
        product.manufacturing.inspection === null
          ? null
          : formatBooleanField(product.manufacturing.inspection, "availability"),
    },
    ...product.technical.tooling.map((item) => ({
      ...item,
      value:
        item.label === "Tool lead time"
          ? formatLeadTime(item.value)
          : formatSpecification(item.value),
    })),
  ];
  const packagingItems = [
    {
      label: "Shipping Type",
      value: product.packaging.shippingType
        ? formatShippingType(product.packaging.shippingType)
        : null,
    },
    {
      label: "Primary Packaging",
      value: product.packaging.primary
        ? formatPackaging(product.packaging.primary)
        : null,
    },
    {
      label: "Secondary Packaging",
      value: product.packaging.secondary
        ? formatPackaging(product.packaging.secondary)
        : null,
    },
    { label: "Packaging Notes", value: product.packaging.notes },
    { label: "Delivery Terms", value: commercial.deliveryTerms },
  ];
  const commercialItems = [
    {
      label: "Pricing Model",
      value: commercial.priceType ? formatPriceType(commercial.priceType) : null,
    },
    { label: "Currency", value: commercial.currency },
    {
      label: "Price Unit",
      value: commercial.priceUnit ? formatPriceUnit(commercial.priceUnit) : null,
    },
    {
      label: "Free Sample",
      value:
        commercial.freeSample === null
          ? null
          : formatBooleanField(commercial.freeSample, "availability"),
    },
    { label: "Sample Shipping Cost", value: commercial.sampleShippingCost },
  ];
  const hasTechnicalDetails =
    capabilities.length > 0 ||
    industries.length > 0 ||
    technicalItems.some((item) => Boolean(item.value));
  const hasManufacturingDetails =
    Boolean(
      product.manufacturing.productionCapacity ||
        product.manufacturing.minimumOrderQuantity ||
        product.manufacturing.leadTime ||
        product.manufacturing.inspection !== null ||
        product.technical.tooling.length,
    );
  const hasPackagingDetails =
    Boolean(
      product.packaging.shippingType ||
        product.packaging.primary ||
        product.packaging.secondary ||
        product.packaging.notes ||
        commercial.deliveryTerms ||
        incoterms.length,
    );
  const hasCommercialDetails =
    Boolean(
      commercial.priceType ||
        commercial.currency ||
        paymentTerms.length ||
        commercial.freeSample !== null ||
        commercial.sampleShippingCost,
    );

  return (
    <>
      {hasTechnicalDetails ? (
        <Section title="Technical Specifications">
          <TagField label="Capabilities" values={capabilities} />
          <TagField label="Industries Served" values={industries} />
          <SpecGrid items={technicalItems} />
        </Section>
      ) : null}
      {materials.length ? (
        <Section title="Materials & Grades">
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="min-w-0 break-words rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
              >
                {value}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {hasManufacturingDetails ? (
        <Section title="Manufacturing">
          <SpecGrid items={manufacturingItems} />
        </Section>
      ) : null}
      {hasPackagingDetails ? (
        <Section title="Packaging & Delivery">
          <SpecGrid items={packagingItems} />
          <TagField label="Incoterms" values={incoterms} />
        </Section>
      ) : null}
      {hasCommercialDetails ? (
        <Section title="Commercial Information">
          <SpecGrid items={commercialItems} />
          <TagField label="Payment Terms" values={paymentTerms} list />
        </Section>
      ) : null}
      {listing.certifications?.length ? (
        <Section title="Quality & Certifications">
          <div className="flex flex-wrap gap-2">
            {listing.certifications.map((cert) => (
              <Badge key={cert} variant="outline" className="max-w-full whitespace-normal break-words">
                {formatSpecification(cert)}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function LegacySections({ listing }: { listing: PublicListing }) {
  return (
    <>
      {listing.material_spec || listing.moq || listing.lead_time || listing.production_capacity ? (
        <Section title="Specifications">
          <SpecGrid
            items={[
              { label: "Material", value: listing.material_spec },
              { label: "Minimum Order Quantity", value: listing.moq },
              {
                label: "Lead Time",
                value: listing.lead_time ? formatLeadTime(listing.lead_time) : null,
              },
              { label: "Production Capacity", value: listing.production_capacity },
            ]}
          />
        </Section>
      ) : null}
      {listing.certifications?.length ? (
        <Section title="Quality & Certifications">
          <div className="flex flex-wrap gap-2">
            {listing.certifications.map((cert) => (
              <Badge key={cert} variant="outline" className="max-w-full whitespace-normal break-words">
                {formatSpecification(cert)}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function SpecGrid({ items }: { items: Array<ProductSpecification | { label: string; value: string | null | undefined }> }) {
  const visible = items.filter((item) => typeof item.value === "string" && item.value.trim());
  if (!visible.length) return null;
  return (
    <div className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2">
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-slate-800 [overflow-wrap:anywhere]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
        {value?.trim() || "Not specified"}
      </p>
    </div>
  );
}

function TagField({ label, values, list = false }: { label: string; values: string[]; list?: boolean }) {
  if (!values.length) return null;
  return (
    <div className="mb-5 min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {list ? (
        <ul className="list-disc space-y-1 pl-5 text-sm font-medium text-slate-800">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="break-words [overflow-wrap:anywhere]">
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>
              <Badge variant="secondary" className="max-w-full whitespace-normal break-words">
                {value}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
