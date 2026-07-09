# TODO — Product Creation Wizard (Seller)

- [ ] Step 1: Remove modal-based “Add Product” UX
  - [ ] Update `app/dashboard/seller/products/page.tsx` to remove `ProductFormModal` and all modal state.
  - [ ] Make “Add Product” navigate to `/dashboard/seller/products/new`.
  - [ ] Make “Edit” navigate to `/dashboard/seller/products/[productSlug]` (fallback if slug unavailable).

- [ ] Step 2: Create route entrypoints for the wizard workspace
  - [ ] Add `app/dashboard/seller/products/new/page.tsx` (create initial draft + redirect to `[productSlug]`).
  - [ ] Add `app/dashboard/seller/products/create/page.tsx` (redirect/re-export to `/new`).
  - [ ] Add `app/dashboard/seller/products/[productSlug]/page.tsx` (wizard workspace shell: step indicator + sticky action bar + phase rendering).

- [ ] Step 3: Implement the 4-phase wizard UI (no tabs; guided wizard)
  - [ ] Phase 1 (Technical) UI with all blueprint fields and independent validation.
  - [ ] Phase 2 (Commercial) UI with all blueprint fields and independent validation.
  - [ ] Phase 3 (Packing Details) UI with all blueprint fields and independent validation.
  - [ ] Phase 4 (Review) marketplace-quality summary + previews + edit phase links + submit actions.

- [ ] Step 4: Autosave & draft persistence
  - [ ] Implement autosave (every few seconds) using existing seller product APIs (`PATCH /api/dashboard/seller/products?id=...`).
  - [ ] Show “Last saved: X minutes ago”.
  - [ ] Ensure navigation between phases preserves data.

- [ ] Step 5: Backend alignment for blueprint fields (schema/API/RPC)
  - [ ] Extend seller product persistence (seller_products + related tables) to store every blueprint field.
  - [ ] Extend seller/products API POST/PATCH to accept all blueprint fields.
  - [ ] Ensure publish/submit triggers full lifecycle and moderation synchronization.

- [ ] Step 6: Marketplace & Admin moderation synchronization
  - [ ] Add/update API endpoints so “Submit for Review” enqueues a moderation item containing:
    product preview, submitted images, seller company, verification status, risk score,
    industry, capability, materials, approval history, audit trail.
  - [ ] Ensure admin approve/reject updates downstream systems (listing/search/industry/company/analytics/AI/notifications).

- [ ] Step 7: Product URLs
  - [ ] Ensure every product has permanent public URL `/products/[slug]`.
  - [ ] Ensure seller editing URL `/dashboard/seller/products/[slug]`.
  - [ ] Ensure admin review URL `/ops/admin/products/[id]`.

- [ ] Step 8: Testing & QA
  - [ ] Verify draft autosave, phase gating, review completeness, submit workflow, approve workflow.
  - [ ] Validate keyboard navigation and responsive layout.
