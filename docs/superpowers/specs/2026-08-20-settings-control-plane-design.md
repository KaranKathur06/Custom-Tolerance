# CustomTolerance Settings Control Plane

## Status

Approved architecture for implementation on 20 Aug 2026.

## Goal

Replace the raw platform key/value editor with a typed operational control plane while preserving the existing Supabase `platform_settings` table and the four legacy keys. A setting is only exposed as active when it has a validated storage definition, a server-side consumer, permission enforcement, and an audit trail.

## Current Authority

Supabase is the runtime authority. The existing `platform_settings` table is the compatibility store. Prisma models and the separate `marketplace_settings_versions` ranking configuration are outside this control plane.

The control-plane boundary will be:

```text
Admin UI
  -> /api/admin/settings/*
  -> SettingsService
  -> platform_settings + admin_audit_logs
  -> domain services and route handlers
  -> user-visible behavior
```

## Registry And Types

Add a code-owned registry containing the canonical key, category, value type, default, description, permission, sensitivity, editability, and dangerous-change metadata. Supported types are `boolean`, `string`, `number`, `enum`, `object`, and `array`.

The registry rejects unknown keys, malformed values, null operational states, and unsupported enum members. Secret values are never registered for browser exposure. Environment-only values remain environment-only and are surfaced only as redacted integration or health status.

Initial functional keys:

| Category | Keys | Initial consumer |
| --- | --- | --- |
| General | `platform_status`, `maintenance_mode`, `marketplace_status` | maintenance/status resolver and public marketplace routes |
| Registration | `buyer_registration_enabled`, `seller_registration_enabled`, `allow_unverified_rfq_drafts` | registration and RFQ draft routes |
| Verification | `require_verified_buyer_to_publish`, `seller_publishing_policy` | RFQ publish and seller listing/quote gates |
| RFQ | `rfq_creation_enabled`, `rfq_max_per_day`, `rfq_max_attachments`, `rfq_max_attachment_size` | RFQ create/publish and file routes |
| Marketplace | `product_marketplace_enabled`, `supplier_directory_enabled`, `rfq_marketplace_enabled`, `listing_publishing_enabled` | public marketplace and listing APIs |
| Security | `admin_2fa_required`, `login_rate_limit`, `otp_rate_limit` | route protection and existing rate-limit layer |
| Features | `feature_rfq`, `feature_quotes`, `feature_messaging`, `feature_marketplace`, `feature_payments` | feature resolution at server boundaries |
| Uploads | `image_upload_enabled`, `document_upload_enabled`, `engineering_upload_enabled`, `max_image_size`, `max_document_size`, `max_engineering_file_size` | centralized upload policy |
| Payments | `payments_enabled`, `refunds_enabled`, `seller_payouts_enabled` | existing payment route guards |

Unsupported integrations, matching weights, WhatsApp controls, escrow, AI matching, and percentage rollout controls are status-only or deferred until a real consumer exists.

## Legacy Migration

The service reads legacy values first, normalizes them into typed domain values, and writes metadata without resetting values. Compatibility aliases remain available during migration:

```text
maintenance_mode       -> general.platform_status / maintenance_mode
marketplace_status     -> general.marketplace_status
registration_controls  -> registration.*
verification_policies  -> verification.*
```

Legacy keys remain readable through the advanced endpoint until all consumers use domain methods. No destructive delete or silent default overwrite is allowed.

## Service Contract

`SettingsService` owns reads, normalization, validation, writes, optimistic locking, audit redaction, and cache invalidation.

It exposes both generic typed methods and domain methods:

```ts
get(key)
getCategory(category)
getBoolean(key)
getNumber(key)
getString(key)
getEnum(key)
getObject(key)
update(key, value, expectedVersion, reason)

settings.platform.status()
settings.platform.maintenance()
settings.registration.isSellerRegistrationEnabled()
settings.verification.requiresVerifiedBuyer()
settings.rfq.limits()
settings.marketplace.isOpen()
settings.security.isAdmin2FARequired()
```

Database failures use safe, security-biased defaults. High-risk reads are uncached or immediately invalidated. Lower-risk reads may use a short process-local cache with explicit invalidation after successful writes.

## Database Evolution

Extend `platform_settings` non-destructively with nullable metadata columns:

- `category`
- `value_type`
- `default_value`
- `is_sensitive`
- `is_editable`
- `version`
- `updated_by`

Add category and updated-time indexes. Existing rows are backfilled from the registry. Optimistic locking uses `version`; updates require the caller’s expected version and return `SETTINGS_CONFLICT` on mismatch.

## API Contract

The existing `/api/settings/platform` route remains a compatibility facade. New typed endpoints are:

```text
GET   /api/admin/settings
GET   /api/admin/settings/:category
PATCH /api/admin/settings/:category
GET   /api/admin/settings/:category/history
POST  /api/admin/settings/validate
```

Every endpoint requires authenticated admin access, category-specific permission, schema validation, and safe error mapping. Responses never include secrets or raw database errors.

Error codes:

```text
SETTINGS_VALIDATION_FAILED
SETTINGS_PERMISSION_DENIED
SETTINGS_CONFLICT
SETTINGS_NOT_FOUND
SETTINGS_UPDATE_FAILED
```

Writes are transactional per category where the storage API permits it. Bulk responses report individual failures and never claim full success when a member update fails.

## Authorization And Audit

Add permission codes for read/update by category. Security, payments, features, and advanced configuration require elevated permissions. Super-admin behavior remains compatible, but ordinary admin access is narrowed to explicit grants.

Every successful change writes `admin_audit_logs` with actor, key, category, old value, new value, reason, IP, user agent, and severity. Sensitive values are represented by a redacted marker. History reads reuse the existing audit table.

Dangerous changes require a confirmation token/reason from the UI and API. Maintenance, platform closure, registration shutdown, publishing shutdown, payment disablement, and mandatory 2FA are dangerous changes.

## Server-Side Enforcement

The first enforcement pass modifies existing owners:

- RFQ publish route and `publishIrfqDraft` read verification and RFQ settings.
- RFQ draft route permits drafts only when configured and keeps publishing gated.
- Seller product/listing publishing reads marketplace and seller policy settings.
- Marketplace product, supplier, and RFQ APIs enforce platform status and category visibility.
- Upload routes use one centralized policy resolver instead of local constants.
- Payment routes fail closed when operational payment settings disable a capability.
- `protectApiRoute` reads the admin 2FA policy for sensitive admin routes while preserving health/auth/webhook bypasses.

No frontend-only toggle is considered implemented.

## UI Information Architecture

`/ops/admin/settings` becomes an overview with category cards, status, last change, modifier, and manage links. Category pages use stable routes under `/ops/admin/settings/*`. Advanced Configuration preserves the raw editor but makes it read-only or restricted according to registry metadata.

The UI uses the existing dark Ops visual language and gold accent. Operational controls are typed inputs, switches, selects, segmented status controls, and number fields. It includes loading, empty, error, saving, conflict, unsaved-change, and dangerous-change confirmation states. Global search covers labels, descriptions, category names, and keys.

## Failure And Safety Rules

- Missing settings database: use safe defaults and show a non-debug operational error in admin UI.
- Malformed stored value: reject it, log a configuration health event, and use the registry default.
- Stale cache: invalidate on mutation; high-risk settings bypass long-lived cache.
- Concurrent edit: return `409 SETTINGS_CONFLICT` with the current version.
- Unavailable integration: expose status only; do not enable a feature that has no backend provider.
- Maintenance mode: preserve admin access, health endpoints, auth, critical webhooks, and required background work.
- Demo/staging/production remains environment-controlled and read-only in Settings.

## Test Plan

Unit tests cover registry validation, normalization, defaults, redaction, permission mapping, conflict detection, and feature resolution. API tests cover GET/PATCH, unknown keys, malformed values, denied categories, audit creation, and stale versions. Integration tests prove RFQ publish gating, draft behavior, marketplace closure, listing publishing, and upload limits. Existing test conventions in `tests/` are reused.

## Delivery Order

1. Registry, service, migration, permissions, and tests.
2. Typed API facade and legacy compatibility.
3. Settings overview and P0 category pages.
4. Consumer enforcement and focused integration tests.
5. Extended categories, health/integrations, and advanced editor.
6. Full lint, typecheck, build, and relevant test suite.

## Explicit Non-Goals

This change does not migrate Prisma to become runtime authority, replace the marketplace ranking version system, introduce percentage rollouts, add unsupported integrations, or expose environment secrets through the database or browser.