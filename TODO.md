# Seller Onboarding Redesign (CustomTolerance) — Backend-first Execution Checklist

## Step 0 — Verification strategy abstraction (new)
- [ ] Create `lib/marketplace/verification-strategies/` with:
  - [ ] `india.ts` (GST-based phase1/phase2 requirements)
  - [ ] `global-default.ts` (company registration / DUNS-based)
  - [ ] `index.ts` exports resolver `getVerificationStrategy()`
- [ ] Wire resolver into onboarding activation context.

## Step 1 — Refactor activation context
- [ ] Update `lib/marketplace/onboarding-v3-gates.ts`:
  - [ ] Extend return shape to include:
    - [ ] `countryOrigin`
    - [ ] `verificationType`
    - [ ] `phase1Complete` / `registrationRequirementsMet`
    - [ ] `phase2CompletionPercent` (profile strength proxy)
    - [ ] `softMissingItems` vs `hardMissingItems`
    - [ ] `trustScore` / `profileStrength` (use existing `trust_level` + completion percent)
- [ ] Ensure existing callers compile.

## Step 2 — Refactor marketplace gate (tiered access)
- [ ] Update `lib/marketplace/supplier-marketplace-gates.ts`:
  - [ ] Introduce tier model for actions:
    - [ ] Tier 1: allow when `registrationRequirementsMet` and seller is `REGISTERED`
    - [ ] Tier 2: allow/boost based on phase2 signals (soft requirements)
    - [ ] Tier 3: strict gates for premium/verified actions (docs/bank approval/trust)
  - [ ] Remove hard blocking on `profileCompletionPercent < 100` for Tier 1 actions
  - [ ] Preserve hard block for suspended/rejected/under-review as per new requirements
- [ ] Update user-facing missing requirements messaging.

## Step 3 — Split documents conceptually
- [ ] Update `getSellerV3ActivationContext` and downstream input to treat:
  - [ ] registration docs (country-aware)
  - [ ] trust docs (profile boost)
- [ ] Ensure required docs for Tier 1 are minimal & country-aware.

## Step 4 — Compile + quick verification
- [ ] Run TypeScript build/lint/tests
- [ ] Smoke test a mocked activation context for:
  - [ ] REGISTERED seller with low phase2 completion → can create listings/respond RFQs
  - [ ] APPROVED/Trust docs missing → should still be allowed for Tier 1 (but not Tier 3)
