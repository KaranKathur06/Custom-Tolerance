# Product Draft Lifecycle Reliability Design

## Scope

Repair the seller product workflow from draft creation through marketplace presentation. The scope includes canonical draft persistence, product-image storage, optimistic concurrency, phase validation, product-media lifecycle, review rendering, and publish validation. It excludes unrelated onboarding, RFQ, orders, and membership changes.

## Audit findings

| Area | Current implementation | Risk |
| --- | --- | --- |
| Draft state | `ProductWorkspace` hydrates phase data from the seller-products endpoint and keeps edits in a ref. | The persisted response is not represented by one shared product DTO. |
| Autosave | Client PATCH calls are serialized locally but carry no version. | A second browser/device or a delayed request can overwrite newer data. |
| Relations | Materials, grades, capabilities, industries, payment terms, and Incoterms are stored in normalized relation tables. | Partial review/marketplace mappings can hide persisted data. |
| Media | `/api/products/images` hardcodes `product-images` and uploads before a media record exists. | A missing bucket causes the observed failure; metadata/order/cleanup are not atomic. |
| Review | Phase 4 reads the client draft and renders a short, manually maintained field set. | Refreshes and buyer-facing output can diverge from persisted product data. |
| Formatting | Domain values are rendered from generic string/number values. | Values such as lead time and precision can be malformed. |

## Architecture

```text
Seller workspace
  -> versioned partial draft PATCH
  -> seller_products + normalized relations
  -> canonical Product DTO / display model
       -> Marketplace Preview
       -> Marketplace product page

Image selection
  -> client checks
  -> owned server upload endpoint
  -> products/{sellerId}/{productId}/{uuid}.{ext}
  -> product_images metadata
  -> canonical Product DTO
```

### Canonical product representation

Introduce a server-side product read model that composes `seller_products`, `product_images`, `product_materials`, `product_grades`, capabilities, industries, payment terms, and Incoterms. Its contract has explicitly ordered media (`id`, signed/public URL according to projection, path, MIME, size, sort order, primary state), string-array relations, commercial/technical scalar fields, and omission semantics for empty optional values. The seller-review projection includes only the seller's editable draft; the public projection is derived from the same internal model but is available only after the established approved/active state and excludes operational, seller-private, and verification fields. Neither page reads phase-local state.

### Draft writes and concurrency

Draft writes are PATCH operations only: omitted fields remain unchanged. Add a monotonically changing draft version to `seller_products`. Every aggregate mutation is made through one transaction-capable RPC: it locks/checks the parent product version and editable status, applies the scalar patch plus supplied relation/media changes, and increments the version exactly once. A mismatch returns a typed `409 CONFLICT_STALE_DRAFT`; the client reloads the current DTO and preserves unsaved edits for reconciliation. A pending debounced save must flush before phase navigation or publish. Direct relation replacement from independent client requests is removed.

### Media lifecycle

Use the existing `product_images` table rather than a parallel media system. Extend it only where justified for MIME type, byte size, timestamps, soft-delete status, durable storage-operation state, and a primary/order invariant. Enforce a maximum of three non-deleted images, a partial unique primary-image index, and unique active display order per product. All upload, delete, and reorder mutations run through the versioned aggregate RPC; a deletion of the primary deterministically promotes the lowest remaining order.

The upload route authenticates the seller, verifies ownership and editability, checks bucket availability, validates the declared type plus magic bytes/image decode, rejects unsafe dimensions/pixel counts, strips unneeded metadata, and checks the server-side count. It uploads to a seller/product-scoped path, then creates the metadata record. If metadata persistence fails it removes the object; failures or timeouts enter a durable pending/deletion state for an authenticated reconciliation worker. That worker retries failed object deletes and identifies orphan paths. Media integrity means an owned, non-deleted metadata record whose expected object exists in the permitted namespace.

Draft images remain private and are delivered to their owner through signed URLs. Publication creates a buyer-visible representation only after approval, or serves it through a publication-gated signed URL policy; a draft object is never publicly retrievable. Seller verification and other private documents remain in their existing private namespaces. The migration audits the existing bucket before changing configuration and never blindly flips an existing bucket's public flag or policies. It adds only compatible 5 MB JPEG/PNG/WEBP restrictions and owner-namespace policies. Server-side credentials, when used, remain server-only.

### Validation and publishing

Each phase validates its own required fields before navigation. Final publication flushes outstanding draft writes, then invokes one transactional, idempotent publish RPC. It checks the expected version, locks the product, verifies ownership, required fields, media integrity, and seller/listing state; atomically transitions the existing draft to the established pending-moderation state; and creates at most one pending approval record through a unique constraint. Repeated requests return the same pending state. It never creates a duplicate product.

### Display rules

Dedicated formatters handle tolerance, lead time, quantity, currency, dimensions, and weight without generic camel-case splitting. Optional empty values are omitted; invalid numeric values fail validation rather than rendering `NaN`, `null`, or placeholder artifacts. The preview groups capabilities by manufacturing category and presents populated values as catalog sections.

## API contracts

`PATCH /api/dashboard/seller/products?id={id}` accepts a typed partial draft plus `expectedVersion`, and returns `{ success, product, version }`. Errors are typed consistently, including `CONFLICT_STALE_DRAFT`, validation failures, ownership failures, and editability conflicts.

`POST /api/products/images` returns `{ success: true, media }`. It returns safe typed errors such as `PRODUCT_MEDIA_INVALID_TYPE`, `PRODUCT_MEDIA_TOO_LARGE`, `PRODUCT_MEDIA_LIMIT_REACHED`, `PRODUCT_MEDIA_BUCKET_MISSING`, `PRODUCT_MEDIA_STORAGE_UNAVAILABLE`, and `PRODUCT_ACCESS_DENIED`; provider messages are logged server-side only.

## Migration discipline

Inspect the linked development project before schema work. Apply only additive, idempotent changes needed for draft versioning and product media metadata/constraints. The version migration backfills existing rows with `1`, sets a default, then applies `NOT NULL`; indexes/partial unique constraints are added before the write path switches. Bucket configuration, policies, and existing object paths are audited before any compatible repair. Each migration has pre- and post-deployment verification queries and a rollback plan that removes only new code paths/constraints, never product data. Reuse existing tables and migrations; do not reset data or create duplicate material/media structures.

## Verification

Automated coverage will include draft persistence across phases, version conflicts across scalar/relation/media mutations, media signature/pixel/count/ownership validation, cleanup compensation and reconciliation, primary-image fallback, idempotent publish gating, and canonical review/public parity. Manual QA will validate navigation, refresh, reopen, uploads, delete/reorder, preview, and moderation transition. Finish with lint, typecheck, tests, and production build.

## Risks and mitigations

- Existing migration history may not match the connected project: inspect status and schema before applying any change.
- Relational replacement writes can partially succeed: move related draft writes behind a transaction-capable RPC or compensation strategy.
- Public images must not be conflated with private verification documents: maintain separate buckets/namespaces and authorization paths.
