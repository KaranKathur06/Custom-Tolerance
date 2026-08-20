# CustomTolerance — Production Audit Report
**Date:** 2026-08-17  
**Status:** Pre-Launch Deep System Analysis  
**Methodology:** Complete codebase inventory + dependency mapping + remediation brief alignment  
**Scope:** All routes, all APIs, all services, auth, database, observability gaps

---

## EXECUTIVE SUMMARY

CustomTolerance is currently in **prototype-beta** condition with significant structural issues that will compound post-launch. The codebase has:
- ✅ Good: modular route structure, Supabase integration, RBAC framework
- ❌ Critical: dual data sources (Prisma + raw SQL), 7 crashing routes, no error boundaries, fake data leaks, broken RFQ verification gating
- ❌ High: verification state inconsistency, profile completion miscalculation, ~10 dead buttons, no observability
- ❌ Medium: validation gaps, dev copy in production UI, missing concurrency control, no rate limiting

**Estimate to production-ready:** 6–8 weeks of focused architectural fixes following this plan.

---

## PART A — AUDIT FINDINGS

### 1. Architecture Overview

#### Tech Stack
```
Frontend:        Next.js 14 (App Router, server/client components)
ORM:             Prisma 5.22 (connects to PostgreSQL)
Realtime DB:     Supabase (raw SQL migrations for RFQ, Quote, Verification)
Auth:            next-auth + custom OTP implementation
Validation:      Zod + react-hook-form
Styling:         Tailwind CSS + shadcn/ui (partial)
API Routes:      32+ endpoint categories under /app/api/*
Observability:   MISSING (no Sentry, no structured logging, no metrics)
```

#### Data Model Duality (CRITICAL DEBT)
```
Prisma (ORM-managed):
  - User, Profile, Membership, Supplier, SupplierProduct, Listing
  - Chat, Message, Offer, Payment, Lead, AuditLog, Notification
  - OpsRole, OpsPermission (RBAC foundation)

Supabase (Raw SQL migrations):
  - RFQ (rfqs table) with header + line items (rfq_items)
  - Quote (quotes table) - structured proposal pipeline
  - Verification (seller_profiles, buyer_profiles) - trust primitives
  - Reference data (ref_materials, ref_currencies, ref_units, etc.)
  - Product publishing (seller_products, product_approvals, product_events)
```

**Impact:** Schema consistency risk. ORM updates don't automatically sync Supabase. Two different row creation patterns (Prisma client vs raw SQL). Future migrations will be error-prone.

---

### 2. CRITICAL ISSUES (P0 — Blocking Launch)

#### 2.1 Seven Crashing Routes
| Route | Issue | Digest |
|-------|-------|--------|
| `/ops/admin/audit` | Unhandled exception | `1086482728` |
| `/ops/admin/cms` | Unhandled exception | `4244205276` |
| `/ops/admin/support` | Unhandled exception | `507628362` |
| `/ops/admin/settings` | Unhandled exception | `4224597869` |
| `/ops/crm` | Unhandled exception | `3177596799` |
| `/ops/crm/customers` | Unhandled exception | `3919962569` |
| `/ops/crm/tasks` | Unhandled exception | `3183830415` |

**Root cause:** Missing error boundaries. Users see raw Next.js digest strings instead of proper error states.

**Solution:** Add `app/global-error.tsx`, `app/ops/admin/error.tsx`, `app/ops/crm/error.tsx` with proper error UI. Integrate Sentry to capture and alert on these crashes.

---

#### 2.2 RFQ Verification Gating Broken
**Current flow:**
```
Buyer → /rfq/new → fill 5-step wizard → [Submit] → POST /api/rfq
  ↓
Server: requires buyer profile → not created yet
  ↓
Response: "Failed to create buyer profile"
  ↓
User sees: raw error, confused, abandons
```

**Remediation brief requirement:** two-track flow.

**Required implementation:**

**Track 1 (Verified Buyer):**
```
GET /rfq/new
  → check getBuyerVerificationState()
  → status: 'verified'
  → show normal wizard
  → [Submit] → POST /api/rfq with status='published'
  → immediate marketplace broadcast
```

**Track 2 (Unverified Buyer):**
```
GET /rfq/new
  → check getBuyerVerificationState()
  → status: 'unverified' | 'partially_verified'
  → render wizard with persistent banner:
     "You're building a draft. To publish and receive quotes, 
      complete verification (~4 min). [Complete Verification]"
  → [Submit] label changes to [Save & continue]
  → POST /api/rfq with status='draft'
  → redirect → /onboarding/buyer?returnTo=/rfq/{id}/publish
  → after onboarding → /rfq/{id}/publish
  → one-click publish to marketplace
```

**Database requirement:** 
- Auto-create empty `buyer_profiles` row on first draft RFQ (needed for FK constraint)
- Persist RFQ drafts in `rfqs` table with `status='draft'`
- Populate `/buyer/rfqs?tab=draft` page with recoverable drafts

---

#### 2.3 Admin Panel Shows Zero Metrics (Data Disconnection)
**Current state:**
```
/ops/admin/users       → "0 users"  (but 3+ real accounts exist)
/ops/admin/listings    → "0 listings" (but seller products exist)
/ops/admin/verification → "0 pending" (but verification queue has items)
/ops/admin/finance     → "Admin 2FA required" (fake gate, see below)
/ops/admin (Command Center) → returns 403 to authenticated admin
```

**Root cause:** APIs not wired to real database queries. Admin UI components render static zeros or cached fake data.

**Required fixes:**
- `GET /api/admin/users?role=&status=&page=` → return real User records from Prisma
- `GET /api/admin/listings?status=pending|all` → return Listing + SellerProduct records
- `GET /api/admin/verifications?status=pending|approved|rejected` → return verification queue
- `GET /api/admin/priority-actions` → return action items: pending verifications, pending listings, reported listings, delayed orders, payment failures
- Paginate using `count()`, not hardcoded "1 2 3"
- Hook each queue into the corresponding admin detail page for action

---

#### 2.4 Admin 2FA Is Fake (Security Theater)
**Current state:**
```
/ops/admin/finance → "Admin 2FA verification required"
```

**Reality:** No enrollment flow. No TOTP generator. No recovery codes. No middleware enforcer. The gate is cosmetic.

**Required fix (choose one path):**

**Path A — Real 2FA (RECOMMENDED for production):**
- Implement TOTP enrollment on first admin login:
  - User gets a QR code → scan in authenticator app
  - User must verify TOTP code to confirm enrollment
  - System generates 10 recovery codes (one-time use)
  - Codes stored hashed in DB
- Middleware: `/ops/admin/*` requires valid TOTP session (60-second window)
- Store 2FA session in Redis with 15-minute expiry
- Logout + re-auth requirse 2FA re-entry

**Path B — Honest removal:**
- Delete all "Admin 2FA required" UI strings
- Don't gate finance unless you implement real 2FA
- Document as: "Admin 2FA in development"

**Choice:** Implement Path A. It's the only secure production option.

---

#### 2.5 Route Hygiene & URL Scheme Duplication
**Current state:**
```
✗ /settings/profile              → 404 (sidebar link goes here)
✗ /seller/settings/store         → 404 (sidebar link goes here)
✗ /seller/products               → 404 (but /dashboard/seller/products works)
✓ /dashboard/buyer/*             → works
✓ /dashboard/seller/*            → works
```

**Problem:** Dual URL schemes cause:
- Broken navigation
- SEO issues (duplicate content if later indexed)
- Bookmarks break
- Email links fail
- Post-launch 301 redirects are costly

**Required fix:** Standardize to ONE canonical scheme.

**Recommendation:** `/dashboard/{role}/*` as canonical.
```
/dashboard/buyer/rfqs
/dashboard/buyer/onboarding
/dashboard/seller/products
/dashboard/seller/orders
/dashboard/seller/settings

Legacy paths → 301 redirects:
/settings/profile → /dashboard/buyer/settings
/seller/products → /dashboard/seller/products
/seller/settings/store → /dashboard/seller/settings
/seller/orders → /dashboard/seller/orders
```

**Deadline:** Fix before launch. Post-launch URL changes break user trust.

---

#### 2.6 ~10 Dead Buttons (Visible but Non-functional)
**Identified buttons:**
```
Seller Dashboard:
  - [View Order] on /seller/orders (all 3 rows)
  - [View RFQs] on /seller/buyers (all 3 rows)

Ops CRM:
  - [Add Lead] on /ops/crm/pipeline
  - [New Campaign] on /ops/crm/campaigns
  - [Activate] on campaign rows (×3)
  - [Schedule Meeting] on /ops/crm/meetings

Admin Finance:
  - [Export Ledger] (behind fake 2FA gate)
```

**Rule:** No production button may be visible and non-functional.

**Fix for each:**
1. **Audit intent:** Is the feature in scope for MVP? Yes/No?
2. **If Yes:** Implement the action or hide behind a feature flag.
3. **If No:** Remove the button permanently or hide behind `<FeatureFlag name="seller_orders">`.

**Immediate action:**
- Search codebase for these button labels
- Add `console.error('Button [x] not yet wired')` to each unimplemented handler
- Implement or remove before launch

---

#### 2.7 Demo Data Leaks (Mixed Real + Fake)
**Current state:**
```
Fake company names visible on same screen as real user data:
  - "Tata Steel", "JSW Group", "SAIL", "Hindalco" (real enterprises)
  - "AutoParts India Ltd" (appears semi-real)
  - Homepage featured listings show fake products

No env flag separation. No visual distinction between demo ↔ real data.
```

**Required fix:**

1. **Environment isolation:**
   ```typescript
   // .env.local
   NEXT_PUBLIC_APP_MODE=demo | staging | production
   ```

2. **Rename all trademarked enterprises:**
   ```
   Tata Steel           → ACME Metalworks Pvt Ltd
   JSW Group            → Alpha Steel Corp
   SAIL                 → Prototype Precision Ltd
   Hindalco             → Sample Castings Co
   AutoParts India Ltd  → Demo Motors Ltd
   ```

3. **Component pattern:**
   ```typescript
   <DemoOnly>
     <FakeFeaturedListings />
   </DemoOnly>
   
   function DemoOnly({ children }) {
     if (env.appMode !== 'demo') return null;
     return (
       <div className="border-2 border-yellow-500 bg-yellow-50">
         <p className="text-xs text-yellow-700">Demo Data (Not Real)</p>
         {children}
       </div>
     );
   }
   ```

4. **Consistency rule:** If `/marketplace?type=products` shows fake data, `/ops/admin/listings` must show the same fake data. Don't mix real data on one screen with fake on another.

---

### 3. HIGH-PRIORITY ISSUES (P1)

#### 3.1 Verification State Inconsistency
**Problem:**

On the same page, same session:
```
Sidebar (Trust Panel):
  ✓ Email verified
  ✓ Mobile verified
  ✗ Identity verification pending

Onboarding Page:
  Missing items:
  - Email verification
  - Mobile verification
```

Also observed:
```
Profile Completion:
  /buyer/notifications → 20%
  /onboarding/buyer   → 8%
  (same user, same session)
```

**Root cause:** Multiple independent `getVerificationState()` or `getProfileCompletion()` functions computing independently. No single source of truth.

**Required fix:**

Create canonical verification engine:
```typescript
// lib/services/verification.ts
export type VerificationState = {
  overallStatus: 'not_started' | 'in_progress' | 'pending' | 
                 'partially_verified' | 'verified' | 'rejected' | 'suspended';
  
  items: {
    email: VerificationItem;
    mobile: VerificationItem;
    identity: VerificationItem;
    business: VerificationItem;
    gst: VerificationItem;
    documents: VerificationItem[];
    bank: VerificationItem;
  };
};

export async function getVerificationState(userId: string): Promise<VerificationState> {
  // Single source of truth: queries real DB state
  // All UI pages consume this exact object
  // No contradictions possible
}
```

Create canonical profile completion engine:
```typescript
// lib/services/profile.ts
export async function getProfileCompletion(userId: string, role: UserRole) {
  return {
    percentage: number;
    completed: number;
    total: number;
    missing: CompletionItem[];
  };
}
```

**Impact:** Every onboarding screen, trust panel, dashboard metric, eligibility check must call these two functions and consume their exact output.

---

#### 3.2 Validation Gaps
**Issues found:**

| Input | Issue | Fix |
|-------|-------|-----|
| RFQ quantity | accepts `-5` | enforce `quantity > 0` at server + client |
| Budget range | accepts `min=50000, max=100` | enforce `max >= min` at server |
| Product phases | can skip Phase 1 → Phase 4 | gate phases, require sequence at server |
| Numeric inputs | missing ranges | validate min/max at server, return 422 |

**Required implementation:**

1. **Server-side (mandatory):**
   ```typescript
   // /api/rfq - POST
   const schema = z.object({
     quantity: z.number().positive('Quantity must be > 0'),
     budgetMin: z.number().optional(),
     budgetMax: z.number().optional(),
   }).refine((d) => !d.budgetMax || !d.budgetMin || d.budgetMax >= d.budgetMin, {
     message: 'Max budget must be >= min budget'
   });
   ```

2. **Client-side (UX):**
   ```typescript
   <FormField name="quantity">
     <input type="number" min="1" />
     {error && <span className="text-red-500">{error.message}</span>}
   </FormField>
   ```

3. **Product phase gating:**
   ```typescript
   function canEnterPhase(draft: ProductDraft, phase: number): boolean {
     for (let i = 1; i < phase; i++) {
       if (!isPhaseComplete(draft, i)) return false;
     }
     return true;
   }
   ```

---

#### 3.3 Dev Copy in Production UI
**Strings to remove/replace:**

| String | Location | Action |
|--------|----------|--------|
| `"Offline / Retrying…"` | `/dashboard/seller/products/new` | Remove (causes confusion) |
| `"migration-safe"` | Onboarding flows | Remove (internal jargon) |
| `"Online billing activates when Razorpay is configured"` | `/seller/membership` | Either configure Razorpay or remove |
| `"No hardcoded demo queue items"` | `/ops/admin` Command Center | Replace with proper empty state |
| `"supplier_success workflow"` | `/ops/admin/verification` | Replace with field label |
| `"disabled until payout/ledger endpoints connected"` | `/ops/admin/finance` | Implement feature or remove button |
| `"No live payout items wired"` | Finance dashboard | Replace with empty state |
| `"No account needed until submit"` | `/rfq/new` (to authenticated users) | Remove |

**Pattern:** Any string starting with "No live", "Failed to load", "Not wired", "Endpoint not configured" is a red flag. Replace with proper states or remove.

---

### 4. DATABASE & SCHEMA ISSUES

#### 4.1 Missing Models in Prisma
```
RFQ      → stored in Supabase raw SQL (rfqs, rfq_items)
Quote    → stored in Supabase raw SQL (quotes)
Order    → MISSING (no table found)
Verification → seller_profiles, buyer_profiles (Supabase)
```

**Impact:** Can't use Prisma for these critical entities. All queries must be raw SQL or Supabase client.

**Recommendation:** Decide migration strategy:
1. **Option A (Recommended):** Keep Supabase as authoritative for RFQ/Quote. Migrate to full Supabase client library for type safety.
2. **Option B:** Migrate RFQ/Quote into Prisma schema. Regenerate client.

---

#### 4.2 Missing Indexes
**Critical queries that need indexes:**
```sql
-- RFQ marketplace
CREATE INDEX idx_rfqs_status_created_at ON rfqs(status, created_at DESC);
CREATE INDEX idx_rfqs_buyer_id_status ON rfqs(buyer_id, status);

-- Quote lookup
CREATE INDEX idx_quotes_seller_id_status ON quotes(seller_id, status);

-- Verification queue
CREATE INDEX idx_verification_records_user_id_status ON verification_records(user_id, status);

-- Listing search
CREATE INDEX idx_listings_status_capabilities ON listings(status) INCLUDE (capabilities);

-- Message threading
CREATE INDEX idx_messages_thread_id_created_at ON messages(thread_id, created_at DESC);
```

**Action:** Run `EXPLAIN ANALYZE` on critical queries; add missing indexes.

---

#### 4.3 Missing Constraints
**Should be enforced at DB level:**
```sql
-- Unique quote per seller per RFQ (or version tracking)
ALTER TABLE quotes ADD UNIQUE(rfq_id, seller_id);

-- Soft delete consistency
ALTER TABLE rfqs ADD CONSTRAINT deleted_at_only_with_status 
  CHECK (deleted_at IS NULL OR status IN ('closed', 'cancelled'));

-- Enum enforcement on status fields
ALTER TABLE rfqs ALTER COLUMN status 
  SET DEFAULT 'draft'::rfq_status;
```

---

### 5. SECURITY GAPS

#### 5.1 RBAC Enforcement
**Observation:** RBAC framework exists (`lib/auth/rbac.ts`, `lib/auth/permissions.ts`) but middleware not consistently applied.

**Missing:**
- Middleware on `/ops/admin/*` routes checking `role IN ('admin', 'super_admin')`
- Middleware on `/ops/crm/*` routes checking permissions
- Resource ownership checks on all write operations

**Required:** Create middleware:
```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/ops/admin')) {
    const role = req.cookies.get('user_role');
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.redirect('/');
    }
  }
}
```

#### 5.2 Resource Ownership Gaps
**Example vulnerability:**
```
Buyer A: GET /api/rfq/buyer-b-rfq-id
Expected: 403 Forbidden
Actual: ??? (unknown)
```

**Required:** Every read/write validates `resource.owner_id === session.user_id` OR admin.

---

#### 5.3 Rate Limiting
**Missing on:**
- RFQ posting (should limit unverified to 20/day, verified to 100/day)
- Quote submission (200/day per seller)
- OTP requests (3/10min per phone)
- Login attempts (5/15min per IP+email)

**Solution:** Implement using `lib/rate-limiter.ts` or add Redis-based limiter.

---

#### 5.4 File Security
**Questions unanswered:**
- Are uploaded drawings/CAD files in private storage or public?
- Do signed URLs expire?
- Are MIME types validated?
- Is file size limited?
- Is virus scanning enabled?

**Required:** Implement signed URL pattern with 24h expiry for sensitive files.

---

### 6. OBSERVABILITY GAPS

**Current state:** Zero production-grade observability.

| Category | Status | Impact |
|----------|--------|--------|
| Error tracking | ❌ None | Crashes invisible to team |
| Structured logging | ❌ None | Can't debug production issues |
| Request tracing | ❌ None | Can't trace slow requests |
| Metrics/KPIs | ❌ None | Blind to platform health |
| Health checks | ❌ None | Unknown when service is down |
| APM | ❌ None | Unknown where performance bottlenecks are |

**Required before launch:**
1. Sentry for error tracking
2. Structured logging (pino) to stdout
3. `/api/health` endpoint with uptime monitoring
4. RFQ/quote/order funnel metrics
5. Database slow query tracking

---

## PART B — PHASED UPGRADE PLAN

### STEP 1: AUDIT (COMPLETED ✅)

Created system inventory of all routes, APIs, data models, auth patterns, and known issues.

---

### STEP 2: BASELINE (IN PROGRESS)

**Objective:** Establish starting point and identify all build/lint failures.

**Actions:**
```bash
pnpm lint                # catch TypeScript/ESLint errors
pnpm build               # catch build-time failures
npm test 2>&1 | tee baseline-tests.log  # catch unit test failures
pnpm prisma migrate status              # check migration state
pnpm supabase status                    # check Supabase sync
```

**Deliverable:** `BASELINE_REPORT.md` listing all failures.

---

### STEP 3: FIX FOUNDATION (BLOCKING LAUNCH)

#### 3.1 Add Error Boundaries

Create three files:
- `app/global-error.tsx` — catches all unhandled exceptions
- `app/ops/admin/error.tsx` — catches admin route errors
- `app/ops/crm/error.tsx` — catches CRM route errors

**Pattern:**
```typescript
'use client';

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-gray-600 mt-2">We've logged this error and will investigate.</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Try again
      </button>
    </div>
  );
}
```

Integrate Sentry:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.captureException(error);
```

#### 3.2 Fix Route Hygiene

Consolidate all routes to `/dashboard/{role}/*` pattern:
```
/settings/profile              → DELETE route, 301 redirect
/seller/settings/store         → DELETE route, 301 redirect
/seller/products               → DELETE route, 301 redirect
/seller/orders                 → DELETE route, 301 redirect
/seller/buyers                 → DELETE route, 301 redirect

/dashboard/buyer/notifications, /dashboard/buyer/settings, etc. → KEEP
/dashboard/seller/products, /dashboard/seller/orders, etc.      → KEEP
```

#### 3.3 Remove Dev Copy

Search and replace all dev copy strings with proper empty states or error messages.

#### 3.4 Isolate Demo Data

Add `NEXT_PUBLIC_APP_MODE` environment variable and `<DemoOnly>` wrapper component.

**Deliverable:** All crashing routes return proper error pages, all dead URLs redirect, no dev copy visible.

---

### STEP 4: DOMAIN INTEGRITY (VERIFICATION & PROFILE)

#### 4.1 Implement Canonical Verification Engine

Create `lib/services/verification-service.ts`:
```typescript
export async function getVerificationState(userId: string) {
  // Single query to verification DB
  // Returns complete state object
  // Used by: onboarding, trust panel, eligibility checks
}
```

#### 4.2 Implement Canonical Profile Completion

Create `lib/services/profile-service.ts`:
```typescript
export async function getProfileCompletion(userId: string, role: UserRole) {
  // Single query
  // Returns { percentage, completed, total, missing }
  // Used by: every dashboard, onboarding progress, all UI checks
}
```

#### 4.3 Wire RBAC Middleware

Add middleware to `/ops/admin/*` and `/ops/crm/*` that checks roles.

#### 4.4 Implement Resource Ownership Verification

Wrapper function for all API route handlers:
```typescript
export async function requireOwnership(resourceId: string, userId: string, resourceType: string) {
  // Verify user owns resource
  // Return 403 if not
}
```

**Deliverable:** Verification state consistent across all pages, profile completion shows one number everywhere.

---

### STEP 5: CORE WORKFLOW RELIABILITY

#### 5.1 Implement RFQ Two-Track Flow

Create `lib/services/rfq-service.ts`:
```typescript
export type BuyerEligibilityState = 
  | { status: 'verified' }
  | { status: 'unverified' | 'partially_verified'; missing: OnboardingStep[] };

export async function getBuyerEligibility(userId: string): Promise<BuyerEligibilityState> {
  // Check verification state
  // Return appropriate track recommendation
}
```

Update `/rfq/new` page:
- Call `getBuyerEligibility()`
- If verified: show normal wizard
- If unverified: show banner + "[Save & continue]" button
- Save draft server-side on submit

#### 5.2 Persist RFQ Drafts

Ensure `/buyer/rfqs?tab=draft` page loads all `status='draft'` RFQs and allows resuming.

#### 5.3 Implement Product Draft Persistence

Create `lib/services/product-service.ts` with phase gating:
```typescript
export function canEnterPhase(draft: ProductDraft, phase: number): boolean {
  // Enforce phase sequence
}
```

#### 5.4 Implement Quote Lifecycle

Define state machine:
```
DRAFT → SUBMITTED → VIEWED → SHORTLISTED → AWARDED
     → REJECTED
     → WITHDRAWN
```

Enforce transitions at API layer.

**Deliverable:** RFQ two-track works, drafts persist, product phases cannot be skipped, quote states enforced.

---

### STEP 6: RELIABILITY & CONSISTENCY

#### 6.1 Implement Idempotency

Add idempotency key handling to:
- `POST /api/rfq` (publish)
- `POST /api/quote` (submit)
- `POST /api/order` (create)
- `POST /api/verification/:id/approve` (admin)

Pattern:
```typescript
const { 'idempotency-key': key } = req.headers;
const cached = await redis.get(`idempotency:${key}`);
if (cached) return cached;

const result = await executeAction();
await redis.setex(`idempotency:${key}`, 86400, JSON.stringify(result));
return result;
```

#### 6.2 Concurrency Control for RFQ Award

Use database-level optimistic locking:
```sql
UPDATE rfqs SET status='awarded', awarded_quote_id=? 
WHERE id=? AND status IN ('receiving_quotes', 'shortlisting', 'negotiating')
RETURNING *;
```

If 0 rows: return 409 Conflict.

#### 6.3 Add Transactions

Multi-table writes (e.g., RFQ + attachments):
```typescript
await prisma.$transaction(async (tx) => {
  const rfq = await tx.rfq.create({...});
  await tx.rfqAttachment.create({...});
  return rfq;
});
```

**Deliverable:** Double-clicks don't double-charge, concurrent awards can't create duplicate winners.

---

### STEP 7: SECURITY HARDENING

#### 7.1 Implement Real Admin 2FA

- TOTP enrollment on first admin login
- Recovery codes (10 codes, one-time use)
- Middleware enforcing valid 2FA session
- 15-minute session timeout

#### 7.2 Rate Limiting

Implement on:
- RFQ posting: 20/day unverified, 100/day verified
- Quote submission: 200/day
- OTP requests: 3/10min
- Login: 5/15min per IP+email

#### 7.3 File/Media Security

- Private object storage for sensitive files
- Signed URLs with 24h expiry
- MIME type validation
- File size limits
- Virus scanning (optional but recommended)

**Deliverable:** Admin 2FA works, rate limits enforced, files are private.

---

### STEP 8: TESTING

#### 8.1 Unit Tests

Test domain services:
- `verification-service.ts` — all verification scenarios
- `profile-service.ts` — completion calculation edge cases
- `rbac.ts` — role normalization, permission checks
- Validation schemas — all inputs

#### 8.2 E2E Tests (Golden Paths)

**Buyer flow:**
```
signup → email verify → mobile verify → onboarding → 
RFQ (draft) → complete verification → publish RFQ → 
see matched suppliers
```

**Seller flow:**
```
signup → business verify → create product (all phases) → 
submit product → admin approval → product live
```

**Marketplace transaction:**
```
RFQ published → sellers receive → quote submitted → 
buyer views → buyer shortlists → buyer awards → 
exactly one winner → order created
```

**Recovery flow:**
```
RFQ draft started → browser close → user logs out → 
user logs in → draft recoverable
```

**Authorization test:**
```
Buyer A attempts to read Buyer B's RFQ → 403 denied
```

**Concurrency test:**
```
Two simultaneous award clicks on same RFQ → 
exactly one succeeds, one gets 409 Conflict
```

#### 8.3 Failure Path Tests

- Database unavailable → graceful error
- API timeout → retry + error
- OTP failure → retry UI
- GST lookup fails → queue for retry
- Payment timeout → don't charge, persistent state

**Deliverable:** All golden paths automated, failure paths tested.

---

### STEP 9: OBSERVABILITY

#### 9.1 Integrate Sentry

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

Capture errors in error boundaries and API handlers.

#### 9.2 Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  transport: { target: 'pino/file', options: { destination: 1 } }
});

logger.info({ userId, action: 'rfq_published', rfqId });
```

#### 9.3 Metrics & Health

Create `/api/health`:
```typescript
export async function GET() {
  const db = await prisma.user.count();
  return Response.json({ status: 'ok', checks: { db } });
}
```

Track business metrics:
```
RFQ created count
RFQ published count
Quote submitted count
Quote awarded count
Order created count
Verification approved count
```

**Deliverable:** Crashes reach an inbox, logs searchable, health monitoring active, business metrics visible.

---

## PART C — DELIVERABLES CHECKLIST

### By End of STEP 3 (Foundation)
- [ ] All 7 crashing routes return proper error pages
- [ ] No 404s from sidebar navigation
- [ ] One canonical URL scheme (all /dashboard/{role}/*)
- [ ] No dev copy visible to users
- [ ] Demo data behind env flag, non-trademarked names

### By End of STEP 4 (Domain Integrity)
- [ ] Verification state matches across all pages
- [ ] Profile completion shows one number everywhere
- [ ] RBAC middleware on /ops/* routes
- [ ] Resource ownership enforced on all writes

### By End of STEP 5 (Core Workflows)
- [ ] RFQ two-track verified/unverified flow works
- [ ] RFQ drafts persist server-side and recover
- [ ] Product drafts persist, phases cannot be skipped
- [ ] Quote state machine enforced

### By End of STEP 6 (Reliability)
- [ ] Idempotency keys prevent double-execution
- [ ] RFQ award uses optimistic locking (no duplicate winners)
- [ ] Multi-table writes wrapped in transactions

### By End of STEP 7 (Security)
- [ ] Real admin 2FA (TOTP + recovery codes)
- [ ] Rate limits enforced on critical endpoints
- [ ] File uploads private with signed URLs

### By End of STEP 8 (Testing)
- [ ] All golden paths E2E pass
- [ ] All failure paths tested
- [ ] Concurrency tests pass

### By End of STEP 9 (Observability)
- [ ] Sentry captures all errors
- [ ] Structured logs searchable
- [ ] Health monitoring active
- [ ] Business metrics dashboard live

---

## CONCLUSION

This upgrade transforms CustomTolerance from prototype into production-grade platform. The work is substantial but well-scoped. Following this plan sequentially ensures:

1. **Foundation is stable** (no crashes, no 404s)
2. **Domain logic is correct** (one verification state, proper gating)
3. **Core flows work reliably** (RFQ drafts save, quotes persist)
4. **Concurrency is safe** (no double-charging, no duplicate awards)
5. **Security is real** (2FA works, files private, RBAC enforced)
6. **Team can debug** (errors tracked, logs searchable)

**Estimated timeline:** 6–8 weeks for a focused team of 2–3 engineers.

**Success criterion:** Every item in the "Definition of Done" section of the user's prompt must be checkable as ✓.
