/**
 * Single source of truth for CustomTolerance branding.
 * Import from here instead of hardcoding brand strings in UI, metadata, or emails.
 */

export const BRAND = {
  name: "CustomTolerance",
  shortName: "CustomTolerance",
  tagline: "India's Industrial Procurement Network",
  domain: "customtolerance.com",
  supportEmail: "support@customtolerance.com",
  noreplyEmail: "noreply@customtolerance.com",
} as const;

export function brandSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${BRAND.domain}`
  );
}

export function brandPageTitle(page?: string): string {
  if (!page) {
    return `${BRAND.name} - ${BRAND.tagline}`;
  }
  return `${page} | ${BRAND.name}`;
}

export function brandCopyright(): string {
  return `© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.`;
}
