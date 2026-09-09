# CustomTolerance Route Surface Audit

**Date:** 2026-09-09  
**Scope:** Next.js App Router pages, API handlers, middleware, navigation, deep links, role routing, settings, onboarding, admin, CRM, and known production audit findings.

## Executive Findings

The application has a real route surface, but it currently mixes four URL conventions:

- Public canonical routes: `/marketplace`, `/products/[slug]`, `/suppliers/[slug]`, `/rfq/[slug]`
- User portals: `/buyer/*`, `/seller/*`, `/settings`
- Seller sub-workspaces: `/dashboard/seller/*`
- Operations: `/ops/admin/*`, `/ops/crm/*`

The two reported account URLs are stale links from `components/layout/ProfileDropdown.tsx`. The working implementation is `/settings`, which already supports `?tab=profile`, `security`, `notifications`, `privacy`, and `billing`.

The primary structural defects are:

1. `/dashboard` is used as a fallback by middleware and shared navigation but has no page route.
2. `/account/profile` and `/account/settings` are linked from the account dropdown but have no routes.
3. `/membership`, `/seller/listings/new`, `/ops/suppliers`, `/ops/verification`, `/ops/onboarding`, and `/messages/[threadId]` are referenced but have no page routes.
4. Route constants advertise missing `/admin/*`, `/settings/*` subroutes, `/dashboard/admin/*`, and `/api/auth/session`/`/api/auth/profile` endpoints.
5. Existing seller URLs are split between `/seller/*` and `/dashboard/seller/*`.
6. Ops and CRM route pages exist, but the existing audit reports server-side data failures in several of them.
7. There are no route-level `loading.tsx` or `not-found.tsx` files; only admin/CRM error boundaries and the root global error boundary exist.

## Canonical URL Architecture

The remediation target is one canonical destination per capability:

| Domain | Canonical | Legacy/alias policy |
|---|---|---|
| Public marketplace | `/marketplace` | `/market`, `/listings`, `/suppliers`, `/buyers` redirect or preserve query intent |
| Product detail | `/products/[slug]` | `/marketplace/listings/[slug]` redirects |
| Supplier detail | `/suppliers/[slug]` | `/marketplace/supplier/[id]`, `/marketplace/suppliers/[slug]` redirect |
| Buyer portal | `/dashboard/buyer/*` | `/buyer/*` redirects after equivalent pages are canonicalized |
| Seller portal | `/dashboard/seller/*` | `/seller/*` redirects after equivalent pages are canonicalized |
| Admin operations | `/ops/admin/*` | `/admin/*` redirects to equivalent ops pages |
| CRM operations | `/ops/crm/*` | No duplicate implementation; keep `/ops/crm/*` |
| Global account | `/account/profile`, `/account/settings` | `/settings/profile`, `/settings` compatibility redirects or tab-preserving aliases |
| Onboarding | `/onboarding/buyer`, `/onboarding/seller` | `/onboarding` resolves by role or redirects to role onboarding |
| Messages | `/messages` with `?thread=` | Existing `/messages/[threadId]` notification links must be changed or a guarded dynamic route added |

This is a target architecture, not a license to duplicate pages. Existing pages should be moved only when the equivalent legacy route can be converted to a redirect in the same change.

## Filesystem Route Inventory

`page.tsx` discovery found 106 page routes. Status below describes the current implementation and intended disposition.

### Public and Auth

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/` | filesystem | static | public | public | IMPLEMENT |
| `/about` | filesystem | static | public | public | INVESTIGATE: currently classified as coming-soon content |
| `/careers` | filesystem | static | public | public | INVESTIGATE: currently classified as coming-soon content |
| `/capabilities` | filesystem | static | public | public | IMPLEMENT |
| `/capabilities/[slug]` | filesystem | dynamic redirect | public | public | REDIRECT to marketplace filter |
| `/contact` | filesystem | static | public | public | INVESTIGATE: currently classified as coming-soon content |
| `/faq` | filesystem | static | public | public | INVESTIGATE: currently classified as coming-soon content |
| `/help` | filesystem | static | public | public | INVESTIGATE: currently classified as coming-soon content |
| `/industries` | filesystem | static | public | public | IMPLEMENT |
| `/industries/[slug]` | filesystem | dynamic | public | public | IMPLEMENT |
| `/login` | filesystem | static | public | public | IMPLEMENT |
| `/register` | filesystem | static | public | public | IMPLEMENT |
| `/forgot-password` | filesystem | static | public | public | IMPLEMENT |
| `/reset-password` | filesystem | static | public | public | IMPLEMENT |
| `/verify-email` | filesystem | static | authenticated transition | authenticated | IMPLEMENT |
| `/pricing` | filesystem | static | public | public | IMPLEMENT |
| `/privacy` | filesystem | static | public | public | INVESTIGATE: content marked coming soon |
| `/terms` | filesystem | static | public | public | INVESTIGATE: content marked coming soon |
| `/refund` | filesystem | static | public | public | INVESTIGATE: content marked coming soon |
| `/sell` | filesystem | static | public | public | IMPLEMENT |

### Marketplace and Public Resources

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/marketplace` | filesystem/navigation | static | public | public | IMPLEMENT/canonical |
| `/market` | filesystem | static | authenticated marketplace | authenticated | REDIRECT or verify intended analytics surface |
| `/products` | filesystem | static | public | public | INVESTIGATE: currently coming-soon category page |
| `/products/[slug]` | filesystem | dynamic | public | public | IMPLEMENT/canonical; must return intentional 404 for missing slug |
| `/listings` | filesystem | static redirect | public | public | REDIRECT to `/marketplace` |
| `/listings/[id]` | filesystem | dynamic redirect | public | public | REDIRECT to `/marketplace` currently; verify ID loss |
| `/suppliers` | filesystem | static redirect | public | public | REDIRECT to marketplace supplier tab |
| `/suppliers/[slug]` | filesystem | dynamic | public | public | IMPLEMENT/canonical |
| `/suppliers/verification` | filesystem | static | seller/admin | authenticated | INVESTIGATE: currently uses coming-soon component and role semantics |
| `/buyers` | filesystem | static redirect | public | public | REDIRECT to marketplace buyer tab |
| `/buyers/[slug]` | filesystem | dynamic | public | public | IMPLEMENT |
| `/services` | filesystem | static | public | public | IMPLEMENT |
| `/profile/[slug]` | filesystem | dynamic | public/authenticated | public | IMPLEMENT; role-aware profile visibility |
| `/marketplace/listings/[slug]` | filesystem | dynamic redirect | public | public | REDIRECT to `/products/[slug]` |
| `/marketplace/inquiry/[id]` | filesystem | dynamic redirect | public | public | REDIRECT; preserve inquiry ID or return intentional not-found |
| `/marketplace/supplier/[id]` | filesystem | dynamic redirect | public | public | REDIRECT to supplier canonical |
| `/marketplace/suppliers/[slug]` | filesystem | dynamic redirect | public | public | REDIRECT to supplier canonical |

### Buyer

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/buyer` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT/current home |
| `/buyer/dashboard` | filesystem | static redirect | buyer | authenticated buyer | REDIRECT to `/buyer` |
| `/buyer/requirements` | filesystem | static redirect | buyer | authenticated buyer | REDIRECT to `/buyer/rfqs` |
| `/buyer/rfqs` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT |
| `/buyer/rfqs/[slug]/workspace` | filesystem | dynamic | buyer/seller/admin | authenticated + ownership/match | IMPLEMENT; resource authorization required |
| `/buyer/quotes` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT |
| `/buyer/suppliers` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT/marketplace bridge |
| `/buyer/messages` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT |
| `/buyer/notifications` | filesystem/navigation | static | buyer | authenticated buyer | IMPLEMENT |
| `/buyer/dashboard` | legacy navigation | static redirect | buyer | authenticated buyer | REDIRECT |
| `/rfq/new` | filesystem/CTA | static | buyer | authenticated buyer; verification gate | IMPLEMENT; draft/publish contract required |
| `/rfq/[slug]` | filesystem/notification | dynamic | buyer/seller/admin | authenticated or permitted public state | IMPLEMENT; owner/matched-seller/admin checks |
| `/post-requirement` | filesystem/header | static redirect | buyer | authenticated buyer | REDIRECT to `/rfq/new`; seller blocked by middleware |

### Seller

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/seller` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT/current seller home |
| `/seller/dashboard` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/seller` |
| `/seller/rfqs` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT |
| `/seller/quotes` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT |
| `/seller/orders` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/dashboard/seller/orders` pending canonicalization |
| `/seller/buyers` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/dashboard/seller/buyers` pending canonicalization |
| `/seller/products` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/dashboard/seller/products` |
| `/seller/messages` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT |
| `/seller/notifications` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT |
| `/seller/analytics` | filesystem/navigation | static | seller | authenticated seller | INVESTIGATE: real analytics vs coming-soon behavior |
| `/seller/membership` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT; `/membership` CTA is broken |
| `/seller/settings/store` | filesystem/navigation | static redirect | seller | authenticated seller | REDIRECT to global settings today; needs explicit store-settings decision |
| `/dashboard/seller` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/seller` today; canonicalization target is unresolved |
| `/dashboard/seller/products` | filesystem/navigation/API | static | seller | authenticated seller + ownership | IMPLEMENT; current product authority |
| `/dashboard/seller/products/new` | filesystem/CTA | static | seller | authenticated seller + onboarding | IMPLEMENT |
| `/dashboard/seller/products/create` | filesystem | static redirect | seller | authenticated seller | REDIRECT to `/dashboard/seller/products/new` |
| `/dashboard/seller/products/[productSlug]` | filesystem/deep link | dynamic | seller/admin | authenticated + ownership/admin | IMPLEMENT; parameter is an ID despite name `productSlug` |
| `/dashboard/seller/orders` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT; current seller order authority |
| `/dashboard/seller/buyers` | filesystem/navigation | static | seller | authenticated seller | IMPLEMENT; current buyer directory authority |
| `/dashboard/seller/create` | filesystem | static | seller | authenticated seller | INVESTIGATE/REMOVE; appears to be a legacy flow |
| `/seller/listings/new` | generated trust nudge | missing | seller | authenticated seller | REDIRECT to product creation |
| `/membership` | generated/nav CTA | missing | seller/buyer | authenticated | REDIRECT to `/seller/membership` or pricing by role |

### Account and Settings

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/settings` | filesystem/navigation | static client workflow | authenticated | authenticated | IMPLEMENT/canonical tabbed settings |
| `/settings/profile` | filesystem | static redirect | authenticated | authenticated | REDIRECT to `/settings?tab=profile` |
| `/settings/security` | route constants | missing | authenticated | authenticated | REDIRECT to `/settings?tab=security` or remove constant |
| `/settings/notifications` | route constants | missing | authenticated | authenticated | REDIRECT to `/settings?tab=notifications` or remove constant |
| `/settings/privacy` | route constants | missing | authenticated | authenticated | REDIRECT to `/settings?tab=privacy` or remove constant |
| `/settings/billing` | route constants | missing | authenticated | authenticated | REDIRECT to `/settings?tab=billing` or remove constant |
| `/account/profile` | account dropdown | missing | authenticated | authenticated | REDIRECT to `/settings?tab=profile` or implement canonical account alias |
| `/account/settings` | account dropdown | missing | authenticated | authenticated | REDIRECT to `/settings` or implement canonical account alias |
| `/seller/settings/store` | seller nav | redirect | seller | authenticated seller | REDIRECT, not a duplicate settings page |
| `/ops/account` | filesystem | static | ops | authenticated ops | INVESTIGATE: orphaned route not in ops navigation |

### Admin and Operations

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/ops` | middleware/role home | static | ops | authenticated ops | IMPLEMENT |
| `/ops/admin` | ops nav | static | admin/ops | authenticated ops | IMPLEMENT; current admin command center |
| `/ops/admin/users` | ops nav | static | admin | admin/ops permission | IMPLEMENT; real API wiring required |
| `/ops/admin/users/[id]` | ops action | dynamic | admin | admin + resource access | IMPLEMENT; ownership irrelevant, audit required |
| `/ops/admin/users/[id]/activity` | ops action | dynamic | admin | admin + resource access | IMPLEMENT |
| `/ops/admin/listings` | ops nav | static | admin | admin | IMPLEMENT; real queue data required |
| `/ops/admin/moderation` | ops nav | static | admin | admin | IMPLEMENT |
| `/ops/admin/verification` | ops nav | static | admin/ops | ops permission | IMPLEMENT |
| `/ops/admin/security` | ops nav | static | admin | admin | IMPLEMENT |
| `/ops/admin/finance` | ops nav | static | finance/admin | admin permission | INVESTIGATE: current 2FA placeholder/data state |
| `/ops/admin/audit` | ops nav | static | admin | admin permission | IMPLEMENT; known server failure target |
| `/ops/admin/cms` | ops nav | static | admin | admin permission | IMPLEMENT; known server failure target |
| `/ops/admin/support` | ops nav | static | support/admin | ops permission | IMPLEMENT; known server failure target |
| `/ops/admin/settings` | ops nav | static | admin | admin permission | IMPLEMENT; known server failure target |
| `/ops/admin/settings/[category]` | ops action | dynamic | admin | admin permission | IMPLEMENT |
| `/admin` | legacy/admin nav | redirect | admin | admin + 2FA for elevated roles | REDIRECT to `/ops/admin` |
| `/admin/verify` | middleware | static | admin | authenticated admin | IMPLEMENT step-up flow |
| `/admin/rfqs` | legacy admin filesystem | static | admin | admin | REDIRECT or remove after equivalent ops surface confirmed |
| `/admin/marketplace-settings` | legacy admin filesystem | static | admin | admin | REDIRECT or remove after equivalent settings surface confirmed |
| `/admin/ranking-preview` | legacy admin filesystem | static | admin | admin | REDIRECT or remove after equivalent ops surface confirmed |
| `/dashboard/admin/*` | role-routing constants | missing | admin | admin | REMOVE stale constants or add explicit redirects; do not create duplicates |
| `/ops/suppliers` | supplier-success navigation | missing | supplier_success/admin | ops permission | REDIRECT to `/ops/admin/verification` or implement a distinct supplier workspace |
| `/ops/verification` | supplier-success navigation | missing | supplier_success/admin | ops permission | REDIRECT to `/ops/admin/verification` |
| `/ops/onboarding` | supplier-success navigation | missing | supplier_success/admin | ops permission | INVESTIGATE; no distinct page/data contract found |

### CRM

| Route | Source | Type | Role | Auth | Expected status |
|---|---|---|---|---|---|
| `/ops/crm` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; known server failure target |
| `/ops/crm/pipeline` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; audit dead Add Lead action |
| `/ops/crm/customers` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; known server failure target |
| `/ops/crm/revenue` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT |
| `/ops/crm/campaigns` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; audit create/activate actions |
| `/ops/crm/tasks` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; known server failure target |
| `/ops/crm/meetings` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT; audit schedule action |
| `/ops/crm/analytics` | ops nav | static | CRM ops | authenticated CRM role | IMPLEMENT |

## Missing and Broken Destination Report

| Destination | Root cause | Intended destination | Action | Priority |
|---|---|---|---|---|
| `/account/profile` | Account dropdown points to nonexistent route | Global profile tab | Redirect to `/settings?tab=profile` | P0 |
| `/account/settings` | Account dropdown points to nonexistent route | Global settings | Redirect to `/settings` | P0 |
| `/dashboard` | Middleware/shared nav fallback with no page | Role-aware home | Implement role resolver or redirect by role | P0 |
| `/membership` | Seller CTA points to nonexistent route | Membership/pricing | Redirect by role or update CTA | P0 |
| `/seller/listings/new` | Trust nudge generated obsolete URL | Seller product creation | Redirect to `/dashboard/seller/products/new` | P0 |
| `/messages/[threadId]` | Notification/API creates dynamic URL with no page | Message inbox thread | Add guarded dynamic route or normalize to `/messages?thread=` | P0 |
| `/ops/verification` | Supplier-success nav alias | `/ops/admin/verification` | Redirect | P0 |
| `/ops/suppliers` | Supplier-success nav alias | Existing ops verification/admin workspace | Redirect or remove until distinct contract exists | P1 |
| `/ops/onboarding` | Supplier-success nav has no implementation/data contract | No proven canonical | Remove navigation entry | P1 |
| `/onboarding` | Role `both` and email verification fallback | Role-specific onboarding | Implement role resolver redirect | P0 |
| `/api/auth/session` | Route constant has no handler | Existing Supabase auth bootstrap | Remove constant or add contract-backed handler | P1 |
| `/api/auth/profile` | Route constant has no handler | `/api/settings/user` / profile bootstrap | Remove constant or add contract-backed handler | P1 |
| `/admin/*` constants | Constants advertise pages mostly under `/ops/admin/*` | Ops admin routes | Replace constants with canonical routes | P1 |
| `/settings/{security,notifications,privacy,billing}` | Constants advertise tabs as pages | `/settings?tab=...` | Convert constants to tab URLs or add redirects | P1 |

## Middleware and RBAC Findings

- Protected prefixes: `/dashboard`, `/seller`, `/buyer`, `/settings`, `/post-requirement`, `/onboarding`, `/notifications`, `/ops`, `/admin`.
- Anonymous users are redirected to `/login?redirect=...` for protected prefixes.
- Ops/admin role decisions use auth metadata in middleware; several server pages separately query profile roles. This is a consistency risk and should be unified before launch.
- `/ops` accepts `OPS_ROLE_SET`; `/admin` accepts a broader `ADMIN_ROLE_SET` and then may require 2FA.
- Role fallback destinations currently include `/dashboard`, which is missing.
- `/dashboard/admin/*` is present in `lib/auth/role-routing.ts` but absent from the filesystem.
- Resource pages need explicit ownership checks: RFQ workspace, product detail, quote actions, messages, uploads, and admin user actions.

## API and Data Dependencies

| Workflow | Page surface | API/data authority |
|---|---|---|
| Global profile/settings | `/settings` | `/api/settings/user`, Supabase `profiles`, Supabase Auth |
| Buyer dashboard | `/buyer` | `/api/dashboard/buyer/stats`, inquiries, quotes, notifications |
| RFQ | `/rfq/new`, `/rfq/[slug]`, `/buyer/rfqs` | `/api/inquiries`, `/api/rfq/[slug]`, `/api/v2/rfqs/*`, `rfqs`, `quotes` |
| Seller products | `/dashboard/seller/products/*` | `/api/dashboard/seller/products*`, `seller_products`, child product tables |
| Marketplace | `/marketplace`, `/products/[slug]`, `/suppliers/[slug]` | `/api/marketplace*`, `/api/products*`, `/api/suppliers*` |
| Admin users | `/ops/admin/users/*` | `/api/admin/users*`, profiles/auth authority |
| Verification | `/ops/admin/verification` | `/api/ops/verification-queue`, `/api/ops/verification/[id]` |
| CRM | `/ops/crm/*` | `/api/ops/crm/dashboard`, `/api/crm/leads*`, `/api/crm/pipeline` |
| Messages | `/messages`, buyer/seller message views | `/api/message-threads*`, notification `action_url` |

## Known Server Failures and Non-404 Risks

From existing audit/remediation documents, these routes require root-cause validation even though filesystem pages exist:

- `/ops/admin/audit`
- `/ops/admin/cms`
- `/ops/admin/support`
- `/ops/admin/settings`
- `/ops/crm`
- `/ops/crm/customers`
- `/ops/crm/tasks`

The repository contains route-scoped error boundaries for `/ops/admin` and `/ops/crm`, but no route-scoped loading or not-found states. Error boundaries improve UX but do not fix the underlying API/schema failures.

## Required Implementation Sequence

1. Add role-aware `/dashboard` resolver and account/profile/settings aliases.
2. Normalize broken deep links (`/membership`, `/seller/listings/new`, `/ops/verification`, `/onboarding`, messages).
3. Replace stale route constants and supplier-success navigation entries.
4. Decide and execute seller/buyer canonicalization without duplicate page implementations.
5. Repair known ops/CRM server failures and add route loading/not-found states where data-fetching complexity warrants them.
6. Audit resource-level authorization for dynamic pages and API handlers.
7. Add a route smoke test that compares filesystem routes and referenced destinations, allowing explicit redirect/intentional-404 exceptions.
8. Run build, lint, typecheck, and authenticated role-path checks.

## Remaining Blockers Before Implementation

- Confirm whether `/dashboard/buyer/*` and `/dashboard/seller/*` should become canonical or remain compatibility namespaces. Existing code currently uses both portal families.
- Confirm whether supplier-success needs a distinct `/ops/suppliers` workspace or should use verification/admin routes.
- Confirm whether messages should be a query-driven inbox or a dynamic thread page.
- Remote deployment route verification and production database/API checks require deployed credentials and cannot be proven from the local workspace alone.
