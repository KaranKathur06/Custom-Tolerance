export type SeoMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  imageUrl?: string | null;
};

export function buildSeoMetadata(input: SeoMetadataInput) {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.canonicalPath,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.canonicalPath,
      images: input.imageUrl ? [{ url: input.imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : [],
    },
  };
}

export function buildIndustrySchema(input: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
  };
}

export function buildSupplierSchema(input: {
  name: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  locationLabel?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  certifications?: string[] | null;
  capabilities?: string[] | null;
  reviewAvg?: number | null;
  reviewCount?: number | null;
  gstVerified?: boolean;
  foundingYear?: number | null;
}) {
  const schemas: Record<string, unknown>[] = [];

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: input.name,
    description: input.description ?? undefined,
    url: input.url,
    image: input.coverImageUrl ?? input.imageUrl ?? undefined,
    logo: input.imageUrl ?? undefined,
    foundingDate: input.foundingYear ? String(input.foundingYear) : undefined,
    hasCredential: (input.certifications ?? []).map((name) => ({
      "@type": "EducationalOccupationalCredential",
      name,
    })),
    makesOffer: (input.capabilities ?? []).map((name) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name,
      },
    })),
  };

  if (input.city || input.state) {
    organization.address = {
      "@type": "PostalAddress",
      addressLocality: input.city ?? undefined,
      addressRegion: input.state ?? undefined,
      addressCountry: input.country ?? "IN",
    };
  }

  if (input.locationLabel) {
    organization.areaServed = input.locationLabel;
  }

  if (input.gstVerified) {
    organization.additionalProperty = {
      "@type": "PropertyValue",
      name: "GST Verified",
      value: "true",
    };
  }

  schemas.push(organization);

  if (input.reviewCount && input.reviewCount > 0 && input.reviewAvg) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "AggregateRating",
      itemReviewed: { "@type": "Organization", name: input.name },
      ratingValue: input.reviewAvg,
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    });
  }

  return schemas.length === 1 ? schemas[0] : schemas;
}

export function buildListingSchema(input: {
  name: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  sellerName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ?? undefined,
    url: input.url,
    image: input.imageUrl ?? undefined,
    brand: {
      "@type": "Organization",
      name: input.sellerName,
    },
  };
}

