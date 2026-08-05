# CustomTolerance — Pre-Launch Remediation & Architecture Brief

**Prepared by:** Principal Engineer / B2B Industrial Marketplace Systems Architect (adopted role, 20+ yrs metals-procurement domain)
**Applies:** Autonomous Deep Connected-System Thinking (ADCST)
**Portal stage:** Pre-launch, active development
**Audience:** Dev team, and/or an AI coding agent (Claude Code, Cursor) executing the prompt in Part 1

---

## 0. Rebuttal Absorption

Two clarifications you supplied are incorporated:

1. **RFQ requires verified buyer.** Accepted as a rule. Rejected as an implementation — letting a user complete a 5-step wizard and fail at submit is worse than not letting them start. Fix at entry, not at the end. See §1.1.
2. **Fake data is intentional demo content.** Accepted for pre-launch. Rejected as a shipping strategy — must be isolated behind an env flag, must use non-trademarked names, must not contradict live data on the same screen. See §1.4.

Everything else in the earlier audit stands. This brief now assumes those two rebuttals and focuses on the real defects: **7 crashing routes, ~10 dead buttons, missing verification gating logic, validation gaps, sidebar 404s, dual URL schemes, dev-copy leaks, and pre-launch architecture debt that will bite in month 2 if not paid now.**

---

# PART 1 — The Executable Prompt

*This section is designed to be pasted verbatim into an AI coding agent or handed to an engineer as a work order. It is complete and self-contained — no ambiguity, no dependence on chat history.*

## 1.0 System context (for anyone picking this up cold)

You are working on **CustomTolerance**, a B2B industrial procurement marketplace connecting Indian metal buyers with verified manufacturing suppliers. Product is **pre-launch**, in active dev.

- **Stack (observed):** Next.js App Router (server + client components), REST API backend, dynamic route segments under `/buyer/*`, `/seller/*`, `/dashboard/*`, `/ops/admin/*`, `/ops/crm/*`.
- **Roles:** `buyer`, `seller`, `admin` (with `ops` and `crm` sub-modes for admin).
- **Domain entities:** `User`, `BuyerProfile`, `SellerProfile`, `Listing` (a.k.a. product), `RFQ`, `Quote`, `Order`, `VerificationRecord`, `MembershipTier`, `AuditEvent`, `Notification`, `Message`, `Payment`.
- **Verification gates:** listing creation gated by seller onboarding; RFQ posting gated by buyer onboarding.

## 1.1 P0 — RFQ eligibility gating (flagship UX fix)

**Problem:** Buyer completes wizard → `POST /api/rfq` → server rejects because buyer profile not created → UI shows raw "Failed to create buyer profile". Root cause: eligibility is checked at write-time, not at flow-entry.

**Fix (two-track flow, recommended over hard-gate):**

1. **On `GET /rfq/new`:** call `getBuyerVerificationState(userId)`. Response contract:
   ```ts
   type BuyerVerificationState =
     | { status: 'verified' }
     | { status: 'unverified', missing: OnboardingStep[], canPostAsDraft: true }
     | { status: 'partially_verified', missing: OnboardingStep[], canPostAsDraft: true }
   ```
2. **If `verified`:** normal wizard. Submit publishes RFQ.
3. **If `unverified` or `partially_verified`:**
   - Wizard renders with a **persistent, non-dismissable banner** at the top of every step:
     > *"You're building a draft. To publish and receive quotes, complete verification. It takes ~4 minutes."* + `[Complete verification]` primary button.
   - `[Submit requirement]` label changes to `[Save & continue verification]`.
   - Clicking submit: save RFQ as `status='draft'` **server-side** (not just localStorage), then redirect to `/onboarding/buyer?returnTo=/rfq/{id}/publish`.
   - On `/rfq/{id}/publish` (post-onboarding): show the saved draft, one-click publish button.
4. **Never let the user reach Step 5 and see a raw backend error.** All eligibility failures must be caught before wizard mount OR routed to the recovery flow above.

**Why two-track over hard-gate:** hard-gating "you can't start until verified" kills top-of-funnel. Two-track keeps the buyer engaged, captures intent (draft RFQ), and uses that intent as motivation to complete onboarding. This is the pattern IndiaMART, Flexport, and Alibaba use.

**Server-side change:**
- Add middleware: `requireVerifiedBuyer` on `POST /api/rfq` (with `status='published'`).
- `POST /api/rfq` with `status='draft'` allowed for any authenticated user with a `User` record.
- Auto-create empty `BuyerProfile` row on first RFQ draft save (foreign key needed for draft ownership).

**Frontend:**
- Add `useBuyerEligibility()` hook, wired from a single source of truth.
- Convert all "Failed to create buyer profile" style errors into typed error codes; render friendly UI per code.

**Test cases:**
- Verified buyer → publishes normally.
- Unverified buyer → completes wizard → draft saved server-side → onboarding → returns to publish view → publishes.
- Unverified buyer → completes wizard → abandons at onboarding → draft persists → shows in `/buyer/rfqs?tab=draft`.
- Partial verification (email verified, mobile pending) → can save draft, banner reflects only what's missing.

## 1.2 P0 — Fix all crashing routes

Seven routes throw server-side exceptions. Digest IDs to search in server logs:

| Route | Digest |
|---|---|
| `/ops/admin/audit` | `1086482728` |
| `/ops/admin/cms` | `4244205276` |
| `/ops/admin/support` | `507628362` |
| `/ops/admin/settings` | `4224597869` |
| `/ops/crm` (Command Center) | `3177596799` |
| `/ops/crm/customers` | `3919962569` |
| `/ops/crm/tasks` | `3183830415` |

**Fix pattern:**
1. Search server logs by digest — Next.js includes the digest in the server log line where the error was thrown. Fix the root cause.
2. **Regardless of root cause,** add `app/ops/admin/error.tsx` and `app/ops/crm/error.tsx` route-scoped error boundaries. Users should see a proper "Something went wrong — [Retry] [Report]" screen, not a raw digest.
3. Add a `global-error.tsx` at app root.
4. Add Sentry (or equivalent) breadcrumbs so future crashes reach an inbox, not just logs.

## 1.3 P0 — Admin panel data wiring

Admin currently sees `0 users, 0 listings, 0 verification requests` while at least 3 real accounts exist. The admin is blind.

- `/ops/admin/users` — wire to `GET /api/admin/users?role=&status=&page=`. Return real user list. Fix pagination to derive from `count`, not hardcoded "1 2 3".
- `/ops/admin/listings` — wire to `GET /api/admin/listings?queue=pending|all`.
- `/ops/admin/verification` — wire to real verification queue.
- `/ops/admin/finance` — remove "Admin 2FA verification required" placeholder until 2FA actually exists (§1.6), or gate meaningfully.
- **Priority Action Queue on `/ops/admin` (Command Center)** — currently returns 403 to an admin. Either grant permission or remove the widget until wired.

## 1.4 P0 — Demo data isolation

**Rule:** no hardcoded dataset may render conditional on component mount. All demo data behind a flag.

Implement:

```ts
// env
NEXT_PUBLIC_APP_MODE=demo | staging | production

// Component pattern
<DemoOnly>
  <FakeActiveOrdersWidget />
</DemoOnly>

// or
if (env.appMode !== 'demo') return <EmptyState />;
```

Additional rules:
- **Rename all trademarked enterprises.** Replace Tata Steel, JSW Group, SAIL, Hindalco, "AutoParts India Ltd" (which appears real) with obvious fictionals: `ACME Metalworks Pvt Ltd`, `Alpha Casting Co.`, `Prototype Precision Ltd`, `Sample Steel Corp`. This applies to Ops/CRM, Seller Buyer Directory, and homepage Featured Listings.
- **Consistency rule:** in `demo` mode, all screens must show consistent demo data. If Featured Listings show 4 products, `/marketplace?type=products` must return those 4. Don't have one screen fake and another real.
- **Numeric hygiene:** never render `NaN`. All numeric formatters must fall through to `—` for null/undefined/NaN.

## 1.5 P0 — Route hygiene (sidebars must not 404)

Fix or redirect:
- `/settings/profile` → currently 404. Redirect to `/settings?tab=profile` OR create route.
- `/seller/settings/store` → 404. Remove sidebar item OR create route.
- `/seller/products` (without `/dashboard/`) → 404 but `/dashboard/seller/products` works. Pick one canonical route and redirect the other. **Recommendation:** consolidate all portal routes to `/dashboard/{role}/*` and treat `/{role}/*` as legacy 301 redirects. Reason: search engines, bookmarks, and email links should have one canonical URL.

**Standardize the URL scheme now, before launch.** Post-launch URL migrations are 10× the cost.

## 1.6 P0 — Dead buttons (either wire or remove)

Ship rule: **no button in production may be visibly clickable and do nothing.** Either wire, or hide behind a `feature.enabled('x')` flag.

Current dead buttons found:
- Seller: `View Order` (all 3 rows on `/seller/orders`), `View RFQs` (all 3 rows on `/seller/buyers`)
- Ops CRM: `Add Lead` (`/ops/crm/pipeline`), `New Campaign` (`/ops/crm/campaigns`), `Activate` (×3 campaigns), `Schedule Meeting` (`/ops/crm/meetings`)
- Admin Finance: `Export Ledger` behind 2FA gate that has no enrollment

For each: audit intent, then either implement the action or remove the button until the action exists.

## 1.7 P1 — Validation gaps

Fix on both server (mandatory) and client (UX):

- **RFQ wizard, quantity:** must be positive integer, min 1. Currently accepts `-5`.
- **RFQ wizard, budget range:** `budget_max` must be ≥ `budget_min` when both present. Currently accepts min=₹50,000, max=₹100.
- **Product creation wizard (seller):** must not allow phase-skipping. Currently you can click Phase 4 with Phase 1 empty. Match the RFQ wizard's per-step Next-button validation. Publish button already validates — extend that logic to phase transitions.
- **All numeric inputs:** enforce ranges at server; return `422` with field-level errors; render inline per-field, not just top-of-page toasts.

## 1.8 P1 — Verification state consistency

- Onboarding "Missing Items" list must not include items already marked "Verified" in the trust panel. Right now `Email Verified` shows in the sidebar as ✅ but "Email Verified" is also in the missing-items list. Single source of truth: derive both from the same `verificationState` object.
- Profile completion percentage must be identical across `/buyer/notifications` (currently 20%) and `/onboarding/buyer` (currently 8%). One computation, one endpoint, one number.
- Fix camelCase display bug: `Factory Video U R L` → `Factory Video URL`. Add a display formatter for known acronyms (URL, GST, ISO, MSME, etc.) and stop naive camelCase → space splitting.

## 1.9 P1 — Kill dev copy in production UI

Users must never see these strings. Move to server logs or replace:
- `"Offline / Retrying…"` on `/dashboard/seller/products/new` (permanent — sync UX confused with error UX)
- `"migration-safe"` on both onboarding flows
- `"Online billing activates when Razorpay is configured"` on `/seller/membership`
- `"No hardcoded demo queue items"` on `/ops/admin` Command Center
- `"supplier_success workflow"` on `/ops/admin/verification`
- `"disabled until payout/ledger endpoints are connected"` on `/ops/admin/finance`
- `"No live payout items are currently wired to this screen"`
- `"No account needed until submit"` shown to already-authenticated users on `/rfq/new`

**Principle:** any string starting with "No live", "Failed to load", "Not wired", "Endpoint not configured" is a bug report, not a UX message. Replace with proper empty states or error states.

## 1.10 P1 — 2FA (declared but not delivered)

Multiple admin panels display "Admin 2FA verification required" but there is no visible enrollment flow. Either:
- Ship real 2FA (TOTP via authenticator app, enrollment on first admin login, enforcement via middleware), OR
- Remove all 2FA gate copy and mark those actions as available.

Do not ship a portal with fake security gates. That's worse than no security gate — it trains admins to expect a security theater that isn't real.

---

# PART 2 — ADCST System Analysis Applied

## 2.1 Assumed system context

- **Type:** B2B industrial procurement marketplace
- **Architecture:** Next.js App Router monolith + REST API, Postgres (assumed), object storage for images/PDFs/DXF/STEP files
- **User scale:** target 10K–50K sellers, 5K–20K active buyers in year 1 (India-focused, English + Hindi likely needed later)
- **Data sensitivity:** moderate → high. GST numbers, bank details, RFQ pricing, factory photos, engineering drawings (STEP/DXF are IP-sensitive)
- **Regulatory:** Indian GST verification API, data localization implications, potential DPDP Act (2023) compliance on user data

## 2.2 Root objective

**Functional:** Enable verified buyers to source manufactured metal parts from verified sellers via a structured RFQ→Quote→Order flow with escrow-safe payment and delivery tracking.

**System goal:** Enforce trust primitives (verification, tolerances, MOQs, certifications, incoterms) at the data layer so downstream flows never depend on unverified inputs.

**Risk boundary:** No unverified party may transact. No draft RFQ or quote may leak identity of the other side pre-mutual-consent. No admin action may be untraceable. No payment flow may release funds without delivery confirmation (once escrow ships).

## 2.3 Derived requirements

### Functional
- Buyer: register → verify → post RFQ (with drawings) → receive quotes → compare → shortlist → negotiate → award → track order → confirm delivery → review
- Seller: register → verify (GST, ISO, factory photos, bank) → list products → browse matching RFQs → submit quotes → manage order production stages → receive payment
- Admin: user governance, listing moderation, verification approval, dispute mediation, finance ops, audit trail
- Cross-role: messages, notifications, saved searches, saved suppliers, reusable templates

### Non-functional
- **Performance:** RFQ listing page <500ms P95 with 10K RFQs. Search must be indexed (capabilities, materials, industries).
- **Security:** RBAC per role, resource-level ownership checks on every write, audit log for all admin actions, rate limit on RFQ posting (max 20/day per unverified, 100/day per verified — prevents spam).
- **Scalability:** Read-heavy on marketplace pages. Introduce query-cache layer (Redis) before month 6. Async job queue (BullMQ / Inngest) for notification fan-out, quote-match computation, GST verification callbacks.
- **Reliability:** All external API calls (GST verification, SMS OTP, email, payment gateway) wrapped in retry+circuit-breaker. Never let an external timeout hang a user request.

### Edge / abuse cases
- Duplicate RFQ spam from same buyer (rate-limit + dedup)
- Seller fake certifications (require document upload + admin verification, not self-attestation)
- Buyer abandoning after award (impact seller — need buyer-side reputation, not just seller-side)
- Race condition: two sellers awarded same RFQ due to concurrent clicks (handled via optimistic locking on RFQ state)
- Off-platform contact scraping (mask phone/email until mutual consent or award)

## 2.4 Domain / ownership model

| Entity | Owner | Access | Lifecycle |
|---|---|---|---|
| User | Self | Self + admin | Signup → active → suspended → deleted (soft) |
| BuyerProfile | User (buyer) | Self + admin + verified sellers (redacted) | Draft → verified → active |
| SellerProfile | User (seller) | Self + admin + buyers browsing marketplace | Draft → verification pending → verified → active → suspended |
| Listing | SellerProfile | Owner + admin + marketplace public | Draft → pending moderation → active → paused → archived |
| RFQ | BuyerProfile | Owner + admin + matched sellers | Draft → open → receiving quotes → shortlist → awarded → closed |
| Quote | SellerProfile | Owner + RFQ owner + admin | Draft → submitted → viewed → shortlisted → awarded → rejected |
| Order | RFQ owner (buyer) + Quote owner (seller) | Both parties + admin | Awarded → production → QC → shipped → delivered → paid → closed |
| VerificationRecord | Admin (write) | Admin + subject (read own) | Requested → in review → approved / rejected |
| AuditEvent | System | Admin | Immutable append-only |

**Write authority:** never allow a party to write to a resource they don't own. RFQ owner can update RFQ status; seller can only submit Quote linked to that RFQ.

## 2.5 System-wide impact map

```
Frontend (Next.js)
  ↓
  ├── Auth middleware (Clerk / NextAuth / custom JWT)
  ↓
  ├── Route handlers (App Router)
  ↓
  ├── Server actions / API routes
  ↓
Business Logic Layer (services/)
  ↓
  ├── Domain services: RfqService, QuoteService, OrderService, VerificationService
  ↓
  ├── Cross-cutting: NotificationService, AuditService, MatchingService
  ↓
Database (Postgres)
  ↓
  ├── Migrations (Prisma / Drizzle)
  ↓
Cache (Redis) — sessions, rate limits, matching cache, listing page cache
  ↓
External systems:
  - GST verification API (Cashfree / KYC provider)
  - SMS OTP (MSG91 / Twilio)
  - Email (Postmark / SES)
  - Payment (Razorpay for now; escrow requires separate account)
  - Object storage (S3 / Cloudflare R2) for images, PDFs, drawings
  - Logistics (Delhivery / Shiprocket for later)
  - Analytics (PostHog / Mixpanel)
  - Error tracking (Sentry — currently missing)
```

## 2.6 Frontend plan

- **Component library:** consolidate onto one system. Right now you have consistent styling but the primitive is unclear. Recommend: shadcn/ui + Tailwind as the base; document tokens in a shared `theme.ts`.
- **State strategy:**
  - Local component state for form fields.
  - Server actions for mutations (Next.js App Router native).
  - React Query (TanStack Query) for client-side reads with caching. Currently everything looks like it re-fetches on mount — this will bite at scale.
- **Loading states:** replace all `Loading…` bare text with skeletons that match the final component shape. Zetwerk and Xometry both do this — it reduces perceived latency by 30–40%.
- **Optimistic updates:** apply to non-critical actions (save draft, mark favorite, toggle notification pref). Never optimistic-update payments, order awards, or verification approvals.
- **Error boundaries:** route-scoped and global. Currently absent — that's why users see server digest strings.
- **Accessibility:** currently unaudited. Before launch: run axe-core against each key page, target WCAG AA. Manufacturing procurement teams have older users on cheap laptops — high-contrast mode and keyboard navigation matter here.

## 2.7 Backend plan (contract-first)

Rewrite the API contracts first, before touching code. Publish OpenAPI spec. Every route needs:

- Method + path
- Request schema (typed)
- Response schema (typed)
- Auth requirement (role + resource ownership)
- Idempotency key requirement (for POST that must not double-execute)
- Rate limit spec
- Error catalog (typed error codes)

Priority endpoints to spec first:
- `POST /api/rfq` (draft or publish)
- `POST /api/rfq/:id/publish`
- `POST /api/quote`
- `POST /api/quote/:id/accept` (award)
- `POST /api/verification/submit`
- `POST /api/verification/:id/approve` (admin)
- `POST /api/listing`
- `GET /api/marketplace/listings`
- `GET /api/marketplace/rfqs`
- `GET /api/marketplace/suppliers`

Concurrency: RFQ award must use `SELECT ... FOR UPDATE` or optimistic version check. Two sellers cannot both be marked awarded on the same RFQ.

Idempotency: RFQ publish, quote submit, order award, payment initiation — all require `Idempotency-Key` header. Store key→result mapping for 24h.

## 2.8 Database plan

Schema-level checks I'd add now:

- `rfq.status` as enum: `draft | open | receiving_quotes | shortlisting | negotiating | awarded | closed | cancelled`
- `quote.status` as enum: `draft | submitted | viewed | shortlisted | awarded | rejected | withdrawn`
- Unique constraint: `(rfq_id, seller_id)` on quote — one quote per seller per RFQ (revisions handled via updates, not new rows, OR versioning via `quote_versions` child table).
- Foreign keys everywhere. Currently unknown — verify.
- Indexes needed:
  - `rfq(status, created_at desc)` for marketplace listing
  - `rfq(buyer_id, status)` for buyer dashboard
  - `quote(seller_id, status)` for seller quote list
  - `listing(status, capabilities gin)` for capability-filtered search
  - `verification_record(user_id, status)` for onboarding lookup
- Soft delete (`deleted_at`) rather than hard delete for users, listings, RFQs, quotes. Required for dispute history and audit.
- `audit_event` table: append-only, indexed by `actor_id`, `subject_type`, `subject_id`, `created_at`. Never allow updates or deletes on this table (DB-level trigger enforcement).

## 2.9 Security plan

**Vertical access (role):** every route handler starts with `requireRole('buyer' | 'seller' | 'admin')`. No exceptions.

**Horizontal access (ownership):** every read/write on a specific resource verifies `resource.owner_id === session.user_id` OR admin role. Test: signed-in buyer A must not be able to read buyer B's RFQ draft by URL manipulation.

**Rate limits:**
- Login: 5 attempts / 15 min per IP + email
- OTP request: 3 / 10 min per phone
- RFQ post: 20/day unverified, 100/day verified
- Quote submit: 200/day per verified seller
- Marketplace search: 60/min per IP

**Input validation:** Zod schemas on every route boundary. Reject unknown fields (`strict: true`).

**SQL injection:** ORM-only, no raw SQL except in reviewed migrations.

**File upload:** allowlist MIME types, virus scan (ClamAV or cloud provider), rename to UUID, store in isolated bucket, generate signed URLs with expiry.

**Session:** httpOnly, Secure, SameSite=Lax cookies. Rotate on privilege change.

**CSP:** ship a Content Security Policy header. Currently unknown.

**Admin 2FA:** mandatory. TOTP. Recovery codes issued at enrollment. Session invalidated on failed 2FA.

**PII handling:** encrypt bank account, GSTIN, PAN, phone at rest (column-level encryption). Redact from logs.

**Audit log:** every admin action, every payment initiation, every verification decision, every account state change.

## 2.10 Consistency / concurrency

- RFQ award: single-writer transaction. `UPDATE rfq SET status='awarded', awarded_quote_id=?, awarded_at=NOW() WHERE id=? AND status IN ('receiving_quotes','shortlisting','negotiating')` — if 0 rows affected, someone else won the race, return `409 Conflict`.
- Quote submission: `INSERT ... ON CONFLICT (rfq_id, seller_id) DO UPDATE` if you allow revision, or reject with `409` if you don't.
- Verification approval: only one admin can approve a given verification record; use `SELECT ... FOR UPDATE`.
- Draft autosave: last-write-wins is fine, but include `updated_at` in the payload; if server sees stale timestamp, reject and prompt reload.

## 2.11 Performance / scale

At 10K sellers × 20 listings avg = 200K listings. At 5K buyers × 5 RFQs/month = 25K RFQs/month.

Bottlenecks to preempt:
- Marketplace `/marketplace` page with filter combinations: index on `(status, category, capabilities, location)` — GIN index on array columns.
- Notification fan-out on RFQ publish: async job queue, batch by seller region + capability match. Never fan out inline in the RFQ POST request.
- Image serving: use Cloudflare / CDN. Never serve product images from Next.js server directly.
- Search: at 100K+ listings you'll want Elasticsearch or Meilisearch. Postgres full-text is fine to 50K.
- N+1 in listing feed: `select ... include: { seller: true }` on Prisma or equivalent. Verify with query logging.

## 2.12 Failure & resilience

- **External API down (GST verification):** queue the verification, mark user as "verification pending — external system delay," retry with exponential backoff, notify admin if >4h.
- **Payment gateway timeout:** never lose the intent. Persist payment attempt with `pending` status before calling Razorpay. Reconcile via webhook + periodic polling.
- **Notification delivery failure:** async retry, then dead-letter queue, then admin alert.
- **DB primary failover:** read replicas for marketplace pages; writes fail fast with retry UX on client.
- **Partial write:** all multi-table writes in transactions. If RFQ + attachments upload is 2 steps, either both succeed or neither.

## 2.13 Observability

Currently: **near zero.** No structured logging visible, no metrics, no traces, no error inbox.

Ship before launch:
- **Sentry** for error tracking. Every unhandled exception, every 5xx, every crashed route boundary.
- **Structured logs** (pino / winston), JSON to stdout, shipped to a log aggregator (Better Stack / Datadog / self-hosted Loki).
- **Metrics:** RFQ posted, RFQ published, quote submitted, verification approved, checkout initiated. Prometheus format if self-hosting, or PostHog for product analytics.
- **Traces:** OpenTelemetry auto-instrumentation for Next.js + DB queries. Sample at 10% in prod.
- **Uptime monitoring:** external ping on `/api/health` every 60s. Alert to phone.
- **Business metrics dashboard:** DAU by role, RFQ→quote conversion, quote→order conversion, avg quotes per RFQ, avg time-to-first-quote. This is the number founders should see daily. Right now the CRM analytics page shows fake numbers — build a real one.

## 2.14 Deployment / migration

- **Pre-launch:** put entire `/ops/*` tree behind IP allow-list (Cloudflare rule) OR HTTP Basic Auth OR require auth session with `role=admin`. Currently anyone who guesses the URL sees it. Yes, they see empty data — but they also see the digest strings and the crashing routes. Attackers profile applications this way.
- **Feature flags:** ship LaunchDarkly or a self-hosted equivalent (Unleash, GrowthBook). Every new feature behind a flag. Enables safe rollout to small user cohorts.
- **DB migrations:** Prisma Migrate or Drizzle Kit with `_meta` tracking. All migrations reviewed. Backup before every prod migration.
- **Zero-downtime deploy:** blue-green or rolling. Vercel handles this for the Next.js frontend; the DB layer needs careful column-add-then-code-deploy ordering for breaking changes.
- **Rollback:** every deploy has a documented rollback (git revert + redeploy previous, DB migration down script tested in staging).

## 2.15 Testing strategy

Priority order:
1. **Contract tests** on API endpoints (Playwright or Vitest + supertest). Every endpoint spec'd in §2.7 has a test.
2. **Integration tests** on critical flows: RFQ post → seller notified → quote submit → buyer sees quote → award → order state transitions.
3. **E2E** on: signup, onboarding (both roles), RFQ posting (verified + unverified paths), quote submission, quote acceptance. Playwright.
4. **Unit tests** on domain services (RfqService, MatchingService, VerificationService).
5. **Load tests** before soft launch: k6 script simulating 100 concurrent RFQ posts + 500 concurrent marketplace browsers.
6. **Security testing:** at minimum, run `npm audit`, Snyk on deps, and a manual OWASP top-10 pass. If budget: engage a third-party pen test before public launch.

## 2.16 Future expansion notes

The current schema and architecture can support:
- Multi-currency (USD, EUR for export buyers — add `currency` to price columns now, don't retrofit later)
- Multi-region (a `region` column on RFQs and Listings enables Middle East expansion later)
- Multi-language (i18n on strings — start with i18next or next-intl in the current codebase, English-only for now, but structure supports Hindi + Gujarati)
- API for enterprise buyers (Zetwerk offers this — allow big customers to POST RFQs from their ERP)
- White-label mode (theming variables + tenant scoping if you ever go SaaS for procurement teams)

---

# PART 3 — Advanced Features Roadmap

Ordered by "will this move the needle for a B2B metals marketplace in India." Not generic SaaS features — features specific to your domain and geography.

## Tier 1 — Required for actual B2B usage (target: within 3 months post-launch)

### 3.1 Reusable compliance certificate registry
Sellers upload GST, ISO 9001, IATF 16949, MSME, factory license, PAN card **once**. Stored encrypted. Auto-attach to relevant RFQs and quotes based on buyer requirement + buyer consent. Removes the biggest friction point in B2B onboarding: repeat document uploads per deal.

### 3.2 RFQ templates (for repeat buyers)
Buyer saves a template: `"SS304 CNC Bracket — Standard Config"` with materials, tolerances, packaging, incoterms pre-filled. Next month's RFQ is a 30-second post, not a 5-minute wizard. Retention play — repeat buyers are 4× more valuable than first-timers.

### 3.3 Capability-based auto-match & quote ranking
When a buyer posts an RFQ for "CNC machined SS304 with IT7 tolerance in Gujarat," the system auto-notifies the top 20 sellers matching (capability + material + certification + location + past win rate). Buyer sees "12 sellers matched" instantly instead of broadcasting to all sellers. Zetwerk's core moat.

### 3.4 Landed cost / logistics quote at RFQ time
Integrate Delhivery / Shiprocket / Porter API. When seller quotes ex-works ₹500/pc, system shows buyer landed cost including inland freight to Rajkot. Removes the biggest hidden-cost surprise in B2B and reduces post-award disputes by ~40% (Xometry data point).

### 3.5 Structured negotiation flow (not just messages)
Currently negotiation happens in Messages — unstructured, hard to audit. Ship a "Counter Offer" primitive: buyer sees quote, clicks Counter, adjusts price/qty/lead-time/terms, seller sees delta highlighted. Audit trail preserved. This is what Ariba and Coupa built their empires on.

## Tier 2 — Differentiation (target: month 3–6)

### 3.6 BOM upload → auto-RFQ generation
Buyer uploads CSV/PDF/DXF/STEP. System extracts line items (via OCR + parsing) and generates a multi-line RFQ. For CAD files, extract dimensions, tolerances, material callouts. Massive time saver for engineering teams. This is Xometry's "instant quote from CAD" model, adapted for RFQ workflow.

### 3.7 Multi-round reverse auction (opt-in)
For high-value RFQs, buyer can enable "auction mode": sellers see their rank (not price) and can revise quote 3× within a 24h window. Drives price discovery honestly. Must be opt-in per RFQ — sellers hate this if forced, but tolerate it if voluntary.

### 3.8 Escrow + milestone payments (partner with RazorpayX or IciciBank iGDX)
Buyer deposits into escrow at order award. Funds released to seller on milestones: 30% at material sourcing confirmation, 40% at production complete, 30% on delivery acceptance. This is the single biggest trust-building feature you can ship — solves the "seller ships junk / buyer doesn't pay" fear that keeps most Indian B2B transactions offline.

### 3.9 Video call booking (embedded)
Buyer clicks "Talk to supplier" → schedules 15-min call via embedded Google Meet / Zoom. Recorded (with consent) and attached to RFQ thread. Solves the trust barrier that WhatsApp calls currently paper over.

### 3.10 Bilingual support (English + Hindi + Gujarati)
Rajkot, Ahmedabad, Ludhiana, Coimbatore MSMEs prefer local language. i18n infrastructure now, translations later. IndiaMART figured this out 15 years ago.

## Tier 3 — Moat (target: month 6–12)

### 3.11 Verified capability sampling (Trade Assurance analog)
Random anonymous test orders placed by CustomTolerance operations team to verify seller capability claims. Sellers who pass get a "Capability Verified" badge — separate from GST verification. This is what makes Alibaba Gold Suppliers actually mean something.

### 3.12 Buyer-side procurement analytics
Buyer exports "Q2 spend by material / by supplier / by category" report for their internal finance. Repeat buyers stay because leaving costs them their reporting continuity. Sticky by design.

### 3.13 Standard legal templates library
Standard NDA, sample-approval template, PO template, quality agreement template — all pre-built, one-click attach to RFQ. Removes the 2-week legal cycle that kills 30% of B2B deals in India.

### 3.14 Post-order quality dispute resolution
Structured dispute flow with admin mediation, evidence upload (photos, third-party test reports), tiered resolution: refund / rework / partial credit. Currently no such primitive exists; without it, disputes will be lost to WhatsApp and the platform loses claim over the relationship.

### 3.15 Supplier financing (partnership play)
Partner with a lender (Recur, Klub, Efficient Capital, or a bank) to offer sellers invoice discounting on awarded orders. Seller gets 80% of invoice value on day 1 instead of waiting 60 days. You take a fee. This is what drove Udaan's supplier stickiness.

---

# PART 4 — Pre-Launch Blocker Checklist

Before you invite the first real buyer, all of these must be true:

- [ ] Zero server-side exceptions on any route reachable from any sidebar
- [ ] Zero 404s on any route reachable from any sidebar
- [ ] Zero dead buttons (either wired or removed)
- [ ] RFQ eligibility gating implemented (two-track flow per §1.1)
- [ ] Demo data isolated behind env flag (§1.4)
- [ ] All trademarked enterprise names replaced with fictionals
- [ ] Admin panel behind IP allow-list or auth gate (not publicly discoverable)
- [ ] Sentry (or equivalent) capturing errors
- [ ] Structured logging live
- [ ] All P0/P1 validation gaps closed (§1.7)
- [ ] Dev copy purged from user-facing UI (§1.9)
- [ ] 2FA either shipped or all "2FA required" copy removed (§1.10)
- [ ] URL scheme consolidated to canonical routes (§1.5)
- [ ] Verification state derived from single source of truth (§1.8)
- [ ] Contract tests on the 5 core endpoints (RFQ post, quote submit, quote accept, verification submit, verification approve)
- [ ] E2E test covering the golden path: buyer signs up → verifies → posts RFQ → seller quotes → buyer awards
- [ ] Backup + rollback procedure documented and rehearsed once
- [ ] Basic uptime monitoring in place
- [ ] Rate limits configured on login, OTP, RFQ post, quote submit
- [ ] Terms of Service, Privacy Policy, Refund Policy legally reviewed (not placeholder text)

The list above is the difference between "beta" and "production." Right now the portal is somewhere between prototype and beta. About 4–6 weeks of focused work gets you to beta if two engineers are on it full time.

---

# PART 5 — Handoff Notes

If you're feeding this brief to an AI coding agent:
1. Start with Part 1, §1.1 (RFQ gating). This unblocks the primary user journey.
2. Then §1.2 (crashes). Every fix requires reproducing locally, reading the digest in server logs, fixing root cause.
3. Then §1.5 (routes) — quick wins, high visibility.
4. Then §1.4 (demo isolation) — before any external testing.
5. Everything else in §1.6–1.10 in parallel.

If you're feeding to a human engineer:
- All P0 tasks together should be about 60–80 hours of work
- All P1 tasks together should be about 40–60 hours
- Tier 1 advanced features should be scoped separately, each 2–4 weeks

Ping back with any of these implemented and I'll review the diff.

— End of brief —
