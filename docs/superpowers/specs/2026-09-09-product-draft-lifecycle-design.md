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

Introduce a server-side product read model that composes `seller_products`, `product_images`, `product_materials`, `product_grades`, capabilities, industries, payment terms, and Incoterms. It owns filtering empty values and domain formatting boundaries. The review page and public product page must consume this model, not phase-local state.

### Draft writes and concurrency

Draft writes are PATCH operations only: omitted fields remain unchanged. Add a monotonically changing draft version to `seller_products`. The client sends `expectedVersion`; the server performs a conditional update. A mismatch returns a typed `409 CONFLICT_STALE_DRAFT`; the client reloads the current DTO and preserves unsaved edits for reconciliation. A pending debounced save must flush before phase navigation or publish.

### Media lifecycle

Use the existing `product_images` table rather than a parallel media system. Extend it only where justified for MIME type, byte size, timestamps, soft-delete status, and a primary/order invariant. The upload route authenticates the seller, verifies ownership and editability, checks bucket availability, validates MIME/size/count, uploads to a seller/product-scoped path, then creates the metadata record. If metadata persistence fails, remove the uploaded object. Delete/reorder operations verify ownership, update primary/order deterministically, and remove the backing object when safe.

The `product-images` bucket is public only for buyer-visible listing images; seller verification and other private documents remain in their existing private namespaces. The migration creates or repairs the bucket, applies 5 MB JPEG/PNG/WEBP restrictions, and restricts storage operations to the owner namespace. Server-side credentials, when used, remain server-only.

### Validation and publishing

Each phase validates its own required fields before navigation. Final publication flushes outstanding draft writes, re-reads the canonical persisted product, checks ownership, required fields, media integrity, and seller/listing state server-side, then transitions the existing draft into its established moderation state. It never creates a duplicate product.

### Display rules

Dedicated formatters handle tolerance, lead time, quantity, currency, dimensions, and weight without generic camel-case splitting. Optional empty values are omitted; invalid numeric values fail validation rather than rendering `NaN`, `null`, or placeholder artifacts. The preview groups capabilities by manufacturing category and presents populated values as catalog sections.

## API contracts

`PATCH /api/dashboard/seller/products?id={id}` accepts a typed partial draft plus `expectedVersion`, and returns `{ success, product, version }`. Errors are typed consistently, including `CONFLICT_STALE_DRAFT`, validation failures, ownership failures, and editability conflicts.

`POST /api/products/images` returns `{ success: true, media }`. It returns safe typed errors such as `PRODUCT_MEDIA_INVALID_TYPE`, `PRODUCT_MEDIA_TOO_LARGE`, `PRODUCT_MEDIA_LIMIT_REACHED`, `PRODUCT_MEDIA_BUCKET_MISSING`, `PRODUCT_MEDIA_STORAGE_UNAVAILABLE`, and `PRODUCT_ACCESS_DENIED`; provider messages are logged server-side only.

## Migration discipline

Inspect the linked development project before schema work. Apply only additive, idempotent changes needed for draft versioning and product media metadata/constraints. Reuse existing tables, indexes, and the existing `product-images` bucket migration; do not reset data or create duplicate material/media structures.

## Verification

Automated coverage will include draft persistence across phases, version conflicts, media validation/count/ownership, cleanup compensation, primary-image fallback, publish gating, and canonical review/public parity. Manual QA will validate navigation, refresh, reopen, uploads, delete/reorder, preview, and moderation transition. Finish with lint, typecheck, tests, and production build.

## Risks and mitigations

- Existing migration history may not match the connected project: inspect status and schema before applying any change.
- Relational replacement writes can partially succeed: move related draft writes behind a transaction-capable RPC or compensation strategy.
- Public images must not be conflated with private verification documents: maintain separate buckets/namespaces and authorization paths.
