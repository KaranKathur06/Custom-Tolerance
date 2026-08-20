import { z } from 'zod';

export const SETTING_CATEGORIES = [
  'general',
  'registration',
  'verification',
  'rfq',
  'marketplace',
  'notifications',
  'uploads',
  'payments',
  'security',
  'features',
  'search',
  'compliance',
  'integrations',
  'system',
  'advanced',
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];
export type SettingType = 'boolean' | 'string' | 'number' | 'enum' | 'object' | 'array';
export type SettingClassification = 'public_operational' | 'private_operational' | 'sensitive_operational';

export type SettingDefinition<T = unknown> = {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  type: SettingType;
  defaultValue: T;
  schema: z.ZodType<T>;
  permission: string;
  classification: SettingClassification;
  editable: boolean;
  dangerous?: boolean;
  consumer: string;
  legacyKeys?: string[];
};

const setting = <T>(definition: SettingDefinition<T>) => definition;

export const SETTINGS = {
  platformStatus: setting({
    key: 'platform_status', category: 'general', label: 'Platform status',
    description: 'Controls the overall operational state of the platform.', type: 'enum',
    defaultValue: 'live', schema: z.enum(['live', 'maintenance', 'read_only', 'limited']),
    permission: 'settings.general.update', classification: 'private_operational', editable: true,
    dangerous: true, consumer: 'platform status resolver', legacyKeys: ['maintenance_mode'],
  }),
  marketplaceStatus: setting({
    key: 'marketplace_status', category: 'marketplace', label: 'Marketplace mode',
    description: 'Controls public marketplace availability.', type: 'enum',
    defaultValue: 'open', schema: z.enum(['open', 'limited', 'closed']),
    permission: 'settings.marketplace.update', classification: 'public_operational', editable: true,
    dangerous: true,
    consumer: 'marketplace API and listing visibility', legacyKeys: ['marketplace_status'],
  }),
  maintenanceEnabled: setting({
    key: 'maintenance_enabled', category: 'general', label: 'Maintenance mode',
    description: 'Temporarily restricts marketplace traffic while preserving critical access.', type: 'boolean',
    defaultValue: false, schema: z.boolean(), permission: 'settings.general.update',
    classification: 'private_operational', editable: true, dangerous: true,
    consumer: 'maintenance access policy', legacyKeys: ['maintenance_mode'],
  }),
  buyerRegistrationEnabled: setting({
    key: 'buyer_registration_enabled', category: 'registration', label: 'Buyer registration',
    description: 'Allows new buyer accounts to be created.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.registration.update', classification: 'public_operational',
    editable: true, dangerous: true, consumer: 'buyer registration endpoint', legacyKeys: ['registration_controls'],
  }),
  sellerRegistrationEnabled: setting({
    key: 'seller_registration_enabled', category: 'registration', label: 'Seller registration',
    description: 'Allows new seller accounts to be created.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.registration.update', classification: 'public_operational',
    editable: true, dangerous: true, consumer: 'seller registration endpoint', legacyKeys: ['registration_controls'],
  }),
  requireVerifiedBuyerToPublish: setting({
    key: 'require_verified_buyer_to_publish', category: 'verification', label: 'Verified buyer required to publish RFQs',
    description: 'Unverified buyers may keep drafts but cannot publish them.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.verification.update', classification: 'private_operational',
    editable: true, dangerous: true, consumer: 'RFQ publish service', legacyKeys: ['verification_policies'],
  }),
  allowUnverifiedRfqDrafts: setting({
    key: 'allow_unverified_rfq_drafts', category: 'rfq', label: 'Allow unverified RFQ drafts',
    description: 'Allows authenticated unverified buyers to save RFQ drafts.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.rfq.update', classification: 'private_operational',
    editable: true, consumer: 'RFQ draft endpoint', legacyKeys: ['registration_controls'],
  }),
  rfqCreationEnabled: setting({
    key: 'rfq_creation_enabled', category: 'rfq', label: 'RFQ creation',
    description: 'Allows buyers to create new RFQs.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.rfq.update', classification: 'public_operational',
    editable: true, consumer: 'RFQ creation endpoint',
  }),
  listingPublishingEnabled: setting({
    key: 'listing_publishing_enabled', category: 'marketplace', label: 'Listing publishing',
    description: 'Allows sellers to submit listings for marketplace publication.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.marketplace.update', classification: 'public_operational',
    editable: true, dangerous: true, consumer: 'seller listing service',
  }),
  productMarketplaceEnabled: setting({
    key: 'product_marketplace_enabled', category: 'marketplace', label: 'Product marketplace',
    description: 'Controls public product discovery.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.marketplace.update', classification: 'public_operational',
    editable: true, consumer: 'product marketplace API',
  }),
  supplierDirectoryEnabled: setting({
    key: 'supplier_directory_enabled', category: 'marketplace', label: 'Supplier directory',
    description: 'Controls public supplier discovery.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.marketplace.update', classification: 'public_operational',
    editable: true, consumer: 'supplier directory API',
  }),
  rfqMarketplaceEnabled: setting({
    key: 'rfq_marketplace_enabled', category: 'marketplace', label: 'RFQ marketplace',
    description: 'Controls public RFQ discovery for sellers.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.marketplace.update', classification: 'public_operational',
    editable: true, consumer: 'RFQ marketplace API',
  }),
  admin2faRequired: setting({
    key: 'admin_2fa_required', category: 'security', label: 'Require admin 2FA',
    description: 'Requires an elevated admin session for sensitive administrative actions.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.security.update', classification: 'sensitive_operational',
    editable: true, dangerous: true, consumer: 'admin route protection',
  }),
  imageUploadEnabled: setting({
    key: 'image_upload_enabled', category: 'uploads', label: 'Image uploads',
    description: 'Allows image files to be uploaded to marketplace surfaces.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.uploads.update', classification: 'private_operational',
    editable: true, consumer: 'central upload policy',
  }),
  documentUploadEnabled: setting({
    key: 'document_upload_enabled', category: 'uploads', label: 'Document uploads',
    description: 'Allows business and verification documents to be uploaded.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.uploads.update', classification: 'private_operational',
    editable: true, consumer: 'central upload policy',
  }),
  featureRfq: setting({
    key: 'feature_rfq', category: 'features', label: 'RFQ system',
    description: 'Controls availability of the RFQ workflow.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.features.update', classification: 'public_operational',
    editable: true, dangerous: true, consumer: 'RFQ routes',
  }),
  featureMessaging: setting({
    key: 'feature_messaging', category: 'features', label: 'Messaging',
    description: 'Controls availability of procurement messaging.', type: 'boolean', defaultValue: true,
    schema: z.boolean(), permission: 'settings.features.update', classification: 'public_operational',
    editable: true, consumer: 'messaging routes',
  }),
  legacyMaintenanceMode: setting({
    key: 'maintenance_mode', category: 'advanced', label: 'Legacy maintenance configuration',
    description: 'Compatibility record retained during migration to typed platform status controls.', type: 'object',
    defaultValue: false, schema: z.union([z.boolean(), z.record(z.unknown())]), permission: 'settings.advanced.update',
    classification: 'private_operational', editable: false, consumer: 'legacy compatibility only',
  }),
  legacyMarketplaceStatus: setting({
    key: 'marketplace_status_legacy', category: 'advanced', label: 'Legacy marketplace configuration',
    description: 'Compatibility metadata retained during migration to typed marketplace controls.', type: 'string',
    defaultValue: 'ACTIVE', schema: z.string(), permission: 'settings.advanced.update',
    classification: 'private_operational', editable: false, consumer: 'legacy compatibility only',
  }),
  legacyRegistrationControls: setting({
    key: 'registration_controls', category: 'advanced', label: 'Legacy registration configuration',
    description: 'Compatibility record retained during migration to typed registration controls.', type: 'object',
    defaultValue: {}, schema: z.record(z.unknown()), permission: 'settings.advanced.update',
    classification: 'private_operational', editable: false, consumer: 'legacy compatibility only',
  }),
  legacyVerificationPolicies: setting({
    key: 'verification_policies', category: 'advanced', label: 'Legacy verification configuration',
    description: 'Compatibility record retained during migration to typed verification controls.', type: 'object',
    defaultValue: {}, schema: z.record(z.unknown()), permission: 'settings.advanced.update',
    classification: 'private_operational', editable: false, consumer: 'legacy compatibility only',
  }),
} as const;

export const SETTING_REGISTRY = Object.values(SETTINGS) as SettingDefinition[];
export const SETTING_BY_KEY = new Map(SETTING_REGISTRY.map((definition) => [definition.key, definition]));

export function getSettingDefinition(key: string) {
  return SETTING_BY_KEY.get(key);
}

export function getCategoryDefinitions(category?: string) {
  return SETTING_REGISTRY.filter((definition) => !category || definition.category === category);
}

export function redactSettingValue(definition: SettingDefinition, value: unknown) {
  return definition.classification === 'sensitive_operational' ? '[REDACTED]' : value;
}