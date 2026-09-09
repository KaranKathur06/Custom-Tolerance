# Marketplace Lifecycle and Governance Design

## Decision

Adopt `public.seller_products` as the current transactional authority for the product lifecycle. `product_approvals` is its moderation history and queue; `listings` is not a substitute moderation queue. This design deliberately does not replace the existing schema or delete data. It consolidates existing readers and writers behind canonical services and incremental, additive migrations.

## Evidence

- Seller drafts are created in `seller_products`, submitted by setting `approval_status = pending_review`, and paired with a `product_approvals` row.
- Admin product approval APIs read `product_approvals`, but the visible Admin Listings page reads legacy `listings` and requires a 2FA session. These are different queues, so submitted products can be absent from Admin Listings.
- The seller PATCH endpoint permits edits only in `draft` or `rejected`, but dashboard visibility/featured controls use that endpoint for every product. A submitted or published product therefore receives a lifecycle `409` that the UI renders as a generic failure.
- Public marketplace readers independently filter `is_published` and `approval_status`, and omit seller verification, profile visibility, and the seller's visibility opt-in. Similar checks are duplicated across readers.
- A versioned draft RPC was introduced but the general PATCH endpoint has not adopted it, so aggregate writes remain non-transactional.

## Canonical state model

`lifecycle_status` is the product lifecycle authority; `approval_status` is the corresponding moderation-decision projection:

```text
draft -> pending_review -> approved -> active
  ^          |                |          |
  |          v                v          v
  +------ rejected          paused    archived
```

The additive schema introduces `lifecycle_status text not null default 'draft'` with a check constraint for `draft | pending_review | active | paused | rejected | archived`. `approval_status` remains the immutable moderation-decision projection during the compatibility period: `draft -> draft`, `pending_review -> pending_review`, `approved + active/paused/archived -> approved`, and `rejected -> rejected`. A database CHECK/trigger—not RPC behavior alone—enforces the valid pairs (draft/draft, pending_review/pending_review, approved/active, approved/paused, approved/archived, rejected/rejected) and `is_published = (approval_status = 'approved' AND lifecycle_status = 'active')`.

| Concern | Authority | Meaning |
| --- | --- | --- |
| Product lifecycle | `lifecycle_status` | Seller editability and publication stage |
| Moderation decision | `approval_status` | Approval decision associated with the lifecycle |
| Seller visibility preference | `is_visible` | Buyer publication opt-in; never approval |
| Featured merchandising | admin-controlled `is_featured` | Optional curated ranking signal |
| Moderation history | `product_approvals` | Submitted/reviewed decisions and reasons |
| Seller eligibility | canonical verification projection | May submit and/or become public; never silently hides admin/seller records |
| Profile publication | seller profile visibility | Whether public supplier identity is eligible |

### Transitions and write authority

| Transition | Actor | Preconditions | Result |
| --- | --- | --- | --- |
| Create/update draft | owning seller | draft/rejected, expected version | atomic product aggregate write |
| Submit/resubmit | owning eligible seller | complete draft or rejected product, expected version | atomically moves to `pending_review`, expires/supersedes prior decision, and creates one current pending approval |
| Approve | authorized admin | pending approval | approved/active, visible only if eligibility permits |
| Reject/request changes | authorized admin | pending approval, reason required | rejected, editable, reason and audit event |
| Pause/archive | owning seller or authorized admin | lifecycle-specific policy | no marketplace eligibility |
| Set visible | owning seller | approved/active and eligible | updates only visibility preference |
| Set featured | authorized admin | approved/active and eligible | updates merchandising flag and audit event |

Every attempted invalid transition returns a stable typed error. `409` is used for an expected-version conflict only; lifecycle policy failures return typed business errors with a suitable `422`/`403`/`404` response.

Pending approvals expire after their configured deadline. A scheduled or transactional expiry path marks the approval `expired`, records an audit event, and moves the product from `pending_review` to `draft` with a seller-visible explanation. The pending uniqueness index applies only to current `pending` approvals. Seller cancellation follows the same draft transition. A rejected product may be resubmitted directly; that operation creates a new pending approval while preserving previous approvals as immutable history.

## Canonical eligibility

Implement a single server-side function/query, conceptually `getMarketplaceEligibleProducts`, backed by `canProductBeVisible(product, seller, verification, profileVisibility)`.

It requires all of the following:

1. Product lifecycle is active/approved and not soft-deleted, paused, or archived.
2. Product is published and the seller has enabled `is_visible`.
3. Seller profile is active and publicly visible.
4. Seller satisfies the verification rule configured for marketplace publication.

This projection is the exclusive public source for marketplace search, categories, featured products, supplier storefront catalogs, related products, and product-detail public reads. Seller and admin views deliberately do not use it, so ineligible products remain traceable with an explicit reason. Before switching readers, inventory every public product/listing endpoint, page, and RPC. The `listing_id` bridge is retained as a compatibility projection only until every legacy `listings` reader has moved to the canonical product projection; it is never a second lifecycle authority.

## API and UI design

### Seller

- Versioned draft PATCH uses the aggregate RPC, returns the canonical seller product DTO and incremented version, and never writes relations independently. Direct authenticated DML on lifecycle columns and approval records is revoked; tightly scoped RPCs/server routes are the only mutation path.
- Submission is idempotent and returns the pending approval record.
- Visibility is a separate, typed action. Disabled controls explain the blocking condition; they do not issue a failing PATCH.
- Featured is not exposed as a seller capability until an explicit membership rule exists. The seller UI presents its request state or a clear explanation.
- Dashboard counts derive from the same lifecycle and eligibility projection.

### Admin

- Replace the Admin Listings page data source with `product_approvals` joined to the canonical product/seller/verification projection. Legacy `listings` remains a compatibility projection for the endpoint/page inventory above until it can be retired; it is not used as the approval queue or a write authority.
- Provide a listing review workspace with product data and media, seller identity/verification summary, approval history, actions, required rejection reason, and immutable audit events.
- Make 2FA a real server-side enrollment and session-enforcement flow, including recovery codes, or remove the dead-end UI gate only if security review proves it is not an active security control. Never use a UI-only bypass.

### Verification and documents

Reuse the existing verification tables after a schema/read-write audit; do not introduce a duplicate `VerificationRecord` table. Define a canonical projection that links seller profile, verification case, documents, status, reviewer, and history. Admin queues read that projection. Private documents remain in private Storage namespaces and are viewed/downloaded through expiring signed URLs after authorization; raw paths never reach public clients.

### Supplier storefront

Build a product-first public supplier profile from the public eligibility projection. Sections are hero/trust, company overview, featured/all products, structured capabilities, industries, materials, verified certifications, facility information, and RFQ/contact actions. Product cards include primary image, category/material, key specification, MOQ, lead time, price/RFQ, and seller identity. Empty catalog state says that no products are currently published; management controls remain private.

## Consistency, caching, and audit

All lifecycle mutations run as server-owned transactions/RPCs and append an immutable event: actor, action, subject type/id, metadata, timestamp. This is a dedicated append-only audit ledger, not the mutable `product_events` projection: authenticated roles have no update/delete grants; only controlled transaction/RPC code may insert; retention is explicit. Mutation completion invalidates the seller dashboard, admin queues, marketplace, supplier profile, product detail, featured/search projections, and any relevant server cache tags. Cache invalidation is targeted; public caching is not globally disabled.

## Migration and data repair

1. Run a read-only reconciliation report first: orphan product/media/approval rows, invalid state combinations, absent moderation records, unlinked verification documents, and malformed numeric values.
2. Add only idempotent constraints/functions/indexes needed for the canonical write path. Preserve backward-compatible readers during deployment.
3. Ship the server lifecycle service and canonical read models.
4. Switch seller, admin, marketplace, and supplier-profile consumers.
5. Produce a separate, logged, reversible repair plan for existing bad rows; never auto-delete or auto-publish data.

## Security and reliability

- All product/document mutations validate authenticated user -> seller profile -> owned record; public identifiers alone are never authorization.
- Define one tested `is_authorized_operator(auth.uid(), permission)` server/database predicate using the canonical identity key and the permitted admin/super-admin roles. Admin moderation, RLS, RPCs, and signed document access use this one predicate; no route or policy may compare a different profile key.
- Admin moderation and signed document access enforce role/permission checks on the server. Service-role credentials remain server-only.
- RLS remains enabled for exposed Supabase tables; policies are audited against the canonical access model. Views use security-invoker behavior or remain in an unexposed schema.
- Structured logs record typed error codes and request correlation IDs, but not sensitive document data. Instrument mutation success/error rate and queue age.

## Acceptance tests

Automate the requested create, edit, submit, queue, approve, reject, visibility, featured, ownership, stale-version, document access, cache, and refresh matrix. Include expiry, cancellation, and rejected-product resubmission under the current-pending uniqueness invariant. In addition, test that: a pending product is visible to its seller and administrators but not buyers; a rejected product is editable; a seller cannot alter another seller's product or document; and an admin review action is atomic and auditable. Final gates are lint, TypeScript check, route-surface smoke tests, targeted integration tests, and a production build.

## Rollout and rollback

Deploy additive database migration first, then the server write/read services, then UI consumers behind a compatible release. Observe queue counts, 409/error codes, eligibility deltas, and audit writes. Roll back code consumers before removing any new additive database object; no rollback deletes marketplace records or storage objects.
