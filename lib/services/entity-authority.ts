export type EntityAuthority = {
  entity: string;
  canonicalOwner: "Supabase" | "Prisma" | "Unknown";
  notes: string;
};

export const ENTITY_AUTHORITY_MAP: Record<string, EntityAuthority> = {
  user: {
    entity: "user",
    canonicalOwner: "Supabase",
    notes: "Supabase Auth and current public profile flows remain the authoritative identity source for active app flows.",
  },
  profile: {
    entity: "profile",
    canonicalOwner: "Supabase",
    notes: "Public profile metadata is still written by Supabase-backed onboarding and profile APIs.",
  },
  verification: {
    entity: "verification",
    canonicalOwner: "Supabase",
    notes: "Verification-related tables are not yet centralized, but the active runtime writes and reads still flow through Supabase.",
  },
  rfq: {
    entity: "rfq",
    canonicalOwner: "Supabase",
    notes: "RFQ data and item lifecycle remain Supabase-backed until a formal migration and ownership cutover is approved.",
  },
  quote: {
    entity: "quote",
    canonicalOwner: "Supabase",
    notes: "Quote activity is still operated through the current Supabase platform tables.",
  },
  order: {
    entity: "order",
    canonicalOwner: "Unknown",
    notes: "No confirmed canonical order table was identified in the inspected schema, so this remains a pending authority decision.",
  },
};

export function resolveEntityAuthority(entity: string): EntityAuthority {
  return ENTITY_AUTHORITY_MAP[entity] ?? {
    entity,
    canonicalOwner: "Unknown",
    notes: "This entity has no canonical authority recorded yet.",
  };
}
