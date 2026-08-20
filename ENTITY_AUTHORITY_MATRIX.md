# CustomTolerance Entity Authority Matrix

**Date:** 2026-08-19  
**Purpose:** Establish current storage and ownership boundaries before RFQ, verification, quote, or schema modernization.

## Status Legend

- **Confirmed:** evidenced by the current schema, migration, or route implementation.
- **Partial:** identified in code, but readers/writers are not fully centralized.
- **Unknown:** requires authenticated database inspection or route-by-route tracing before changing it.

| Entity | Current storage | Current writers | Current readers / API | Current service | Prisma model | Supabase table | Canonical owner today | Conflicting writers | Migration requirement | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| User | Supabase `auth.users` plus public profiles; Prisma `users` also exists | Auth flows, profile APIs, Prisma seed/scripts | Auth bootstrap, admin users, dashboards | Auth bootstrap, profile/auth services | `User` | `auth.users`, `profiles` | Supabase Auth identity; public profile authority is **partial** | Auth/profile code and Prisma user paths | Decide whether Prisma `users` remains a projection or is removed later | High |
| Profile | Supabase `profiles`; Prisma `profiles` | Onboarding/profile APIs, auth bootstrap | Dashboards, onboarding, admin/CRM | Profile and onboarding services | `Profile` | `profiles` | Supabase `profiles` in current app flows | Prisma and Supabase profile writes | Map fields and designate one writer | High |
| Company | Supabase | Onboarding and seller/buyer services | CRM, marketplace, verification | Supplier/onboarding projections | None | `companies` | Supabase | Multiple onboarding paths | Add typed contract; do not migrate blindly | High |
| Buyer | Supabase buyer-profile/RFQ ecosystem | Buyer onboarding and RFQ flows | Buyer dashboard, RFQ APIs, marketplace | Buyer/onboarding services | None | `buyer_profiles` and related tables | Supabase | Legacy inquiry and profile paths | Define canonical buyer profile and eligibility source | High |
| Seller | Supabase seller-profile ecosystem plus Prisma `Supplier` | Seller onboarding, product APIs, seeds | Seller dashboards, marketplace, admin verification | Supplier/onboarding services | `Supplier` | `seller_profiles`, `companies` | Supabase seller onboarding is primary; Prisma `Supplier` is parallel | Seller onboarding and Prisma supplier paths | Reconcile identity and product ownership | High |
| Verification | Supabase verification/onboarding tables plus profile flags | OTP, GST, onboarding, admin review | Trust panels, onboarding, RFQ eligibility, admin queue | Verification/security helpers | Partial `Profile.kycStatus` | Verification-related tables | **Not yet canonical** | Profile flags, seller/buyer records, OTP state | Build canonical verification service first | Critical |
| Listing | Prisma `listings` plus Supabase marketplace listings | Seller listing APIs, seed scripts, product publishing sync | Marketplace, seller dashboards, admin | Listing/product publishing services | `Listing` | `listings` | Ambiguous; both code paths exist | Prisma and Supabase writes | Authority matrix plus read/write cutover plan | Critical |
| Product | Supabase `seller_products` plus Prisma `SupplierProduct` | Seller product APIs, publishing workflow, seeds | Seller product UI, marketplace/search, admin approvals | Product publishing services | `SupplierProduct` | `seller_products` | Supabase publishing product is current workflow authority | Prisma supplier product path | Consolidate only after field mapping | Critical |
| RFQ | Supabase `rfqs`, `rfq_items`, attachments and related tables | RFQ APIs, composer/draft flows, migration SQL | Buyer/seller RFQ pages, marketplace, quote APIs | RFQ/IRFQ services | None | `rfqs`, `rfq_items` | Supabase | Legacy `inquiries` and RFQ paths may overlap | Canonical RFQ service and contract tests | Critical |
| RFQ Item | Supabase `rfq_items` and child material/capability tables | RFQ composer and API mutations | RFQ review, matching, quote context | IRFQ services | None | `rfq_items`, child tables | Supabase | Free-form inquiry fields overlap | Preserve structured fields; no destructive migration | High |
| Quote | Supabase `quotes` | Quote API/service and seller flows | Buyer quote comparison, seller quotes, admin/CRM | Quote service | None | `quotes` | Supabase | Prisma `Offer` is a separate legacy negotiation concept | Define quote lifecycle and uniqueness before changes | Critical |
| Order | No confirmed canonical table in inspected Prisma schema; payment/order paths require DB verification | Unknown; award/payment paths need tracing | Seller/buyer order UI and dashboards | Unknown | None confirmed | Unknown | **Unknown** | Likely quote/payment/order projections | Database inspection required before implementation | Critical |
| MessageThread | Supabase `message_threads` | Message thread APIs | Messaging pages and quote/RFQ flows | Messaging services | None | `message_threads` | Supabase | Prisma `Chat` is parallel legacy model | Map thread identity and ownership | High |
| Message | Prisma `Message` plus Supabase message ecosystem | Chat APIs and message APIs | Messages UI, chats, notifications | Messaging services | `Message` | Related Supabase message tables | Ambiguous | Prisma and Supabase | Choose one thread/message authority | High |
| Notification | Prisma `Notification` plus Supabase/event paths | Notification APIs, event workers | Header, notifications pages, dashboards | Notification services | `Notification` | Event/notification tables require verification | Prisma appears primary for app model | Event worker and direct writes | Add event contract and delivery status | Medium |
| Membership | Prisma `Membership` | Membership/payment APIs | Seller membership, billing | Payment/membership services | `Membership` | Payment-related tables may mirror status | Prisma | Razorpay/payment projections | Define payment-to-membership transaction boundary | High |
| Payment | Prisma `Payment` plus Supabase payment tables/events | Payment APIs and Razorpay webhook paths | Finance/admin, membership | Payment services | `Payment` | `payments`, Razorpay event tables | Ambiguous; Prisma and Supabase both present | Gateway webhooks and direct mutations | Reconcile webhook idempotency and authority | Critical |
| Audit | Prisma `AuditLog`, `AdminLog` plus Supabase `admin_audit_logs` | Admin APIs, auth/security paths, workers | Admin audit/security pages | Audit/projection services | `AuditLog`, `AdminLog` | `admin_audit_logs` | Supabase admin audit projection is current Ops reader | Multiple log tables and writers | Immutable event model and append-only policy | High |
| CRM Lead | Prisma `Lead`, `LeadActivity` plus Supabase `leads` | CRM APIs, admin/CRM actions, seeds | CRM command center, pipeline, tasks | CRM projection service | `Lead`, `LeadActivity` | `leads`, `lead_activities` | Ambiguous | Prisma and Supabase CRM paths | Select one transactional source and one projection | High |

## Immediate Decisions

1. Treat Supabase as the authority for the current RFQ/Quote/verification ecosystem until authenticated schema inspection proves otherwise.
2. Treat Prisma `User`, `Profile`, `Supplier`, `Listing`, `SupplierProduct`, `Payment`, and CRM models as parallel application models, not automatically authoritative.
3. Do not migrate, delete, or rename RFQ, Quote, Verification, Order, or payment tables until the unknown rows are resolved against the actual database.
4. Build canonical domain services over the existing authority first; migration comes later and must preserve current writers/readers through a controlled cutover.

## Required Next Evidence

- Authenticated Supabase table inventory and row counts.
- Route-level writer/reader map for RFQ, Quote, Verification, Order, Payment, and CRM Lead.
- Actual Order table or confirmation that order creation is not yet implemented.
- Foreign keys, unique constraints, triggers, RLS policies, and migration history for the critical Supabase tables.