# CustomTolerance Onboarding V3 Design

Date: 2026-06-18
Status: Approved for specification, pending implementation approval
Owner: Product Architecture

## Summary

CustomTolerance onboarding must behave as a trust and matching system, not a simple registration form. The platform handles custom manufacturing, CNC machining, casting, forging, sheet metal fabrication, OEM suppliers, international RFQs, and high-value B2B orders. Buyer and seller onboarding therefore need to collect structured data that powers identity verification, capability verification, RFQ matching, fraud prevention, supplier ranking, CRM segmentation, and future AI matching.

The recommended implementation is `onboarding_v3`: a new flow version that reuses the existing Next.js App Router, Supabase persistence, OTP infrastructure, GST service hook, upload pipeline, verification queue, trust scoring, and `onboarding_sessions` draft model while expanding the data model and UI into role-specific, multi-step wizards.

## Current System Findings

### Existing Strengths

- Buyer and seller onboarding routes already exist:
  - `app/onboarding/buyer/page.tsx`
  - `app/onboarding/seller/page.tsx`
  - `app/api/onboarding/buyer/route.ts`
  - `app/api/onboarding/seller/route.ts`
- Draft onboarding exists through `onboarding_sessions`.
- Seller verification groundwork exists in:
  - `supplier_documents`
  - `supplier_media`
  - `supplier_capabilities`
  - `supplier_factory_details`
  - `supplier_completion_tracking`
  - `supplier_verifications`
  - `supplier_review_logs`
  - `gst_verifications`
- OTP, email verification, upload, GST lookup, trust scoring, and marketplace gates already exist in separate service modules.

### Gaps

- Buyer onboarding is too shallow for procurement intelligence.
- Seller onboarding is not GST-first.
- Bank, PAN, IEC, MSME, factory license, and KYC consent are not modeled deeply enough.
- Seller machinery, export history, certifications, factory media, and quality systems are incomplete.
- Buyer preferences are not normalized enough for AI matching and CRM segmentation.
- Seller flow versions are inconsistent in places: `supplier_verification_v2` is used for active sessions while some commit logic still references older `seller_onboarding` flow assumptions.
- Verification gates need to be enforced server-side, not only through UI messaging.

## Product Principles

1. Onboarding is a trust graph.
2. Every field should support at least one of: matching, ranking, verification, fraud detection, CRM, compliance, or search.
3. Sellers must pass hard verification before marketplace activation.
4. Buyers must verify email and mobile before performing procurement actions.
5. Drafts must be durable, resumable, and versioned.
6. Public supplier profile quality should improve with profile completion, but incomplete data must not pollute public search.
7. Structured tables should be preferred over large JSON blobs once data is committed.

## Architecture Choice

Use a hybrid Next.js architecture:

- Server-rendered route shells for SEO, routing, and auth boundaries.
- Client-side wizard components for step interaction, validation, file upload, OTP, autosave, and progress.
- Supabase as source of truth.
- `onboarding_sessions` as transient draft storage.
- Dedicated normalized tables as committed onboarding intelligence.

This keeps implementation close to the current codebase while allowing future extraction into services if volume or compliance requirements grow.

## Buyer Onboarding V3

### Flow Key

`buyer_onboarding_v3`

### Step 1: Buyer Registration

Collect company identity, contact verification, industry interest, category interest, and legal agreements.

Mandatory company fields:

- Company name
- Business email
- Email OTP verification
- Country
- State
- City
- Company website
- Company type

Company type options:

- OEM
- Importer
- Exporter
- Distributor
- Trader
- EPC Company
- Manufacturer
- Government Organization
- Startup
- Service Company
- Other

Mandatory contact fields:

- Full name
- Designation
- Mobile number
- Mobile OTP verification

Designation options:

- Founder
- CEO
- Director
- Procurement Manager
- Purchase Executive
- Engineer
- Sourcing Manager
- Plant Head
- Operations Head
- Other

Industry multi-select examples:

- Automotive
- Aerospace
- Agriculture
- Oil and Gas
- Defence
- Marine
- Construction
- Railway
- Medical
- Mining
- CNC Machining
- Casting
- Forging
- Sheet Metal
- Injection Molding
- Fasteners
- Electronics
- Extrusion

Category interest multi-select examples:

- CNC Components
- Castings
- Forgings
- Pumps
- Valves
- Gears
- Shafts
- Bearings
- Steel Components
- Brass Components
- Aluminum Parts
- Plastic Parts

Mandatory agreements:

- Buyer Agreement
- Terms and Conditions
- Privacy Policy

### Step 2: Business Information

Collect procurement behavior and international trade preferences.

Fields:

- Annual procurement budget
- Order frequency
- Procurement method
- Import experience
- Countries imported from
- Preferred incoterms
- Preferred payment terms

Annual procurement budget:

- Below $50K
- $50K-$100K
- $100K-$500K
- $500K-$1M
- $1M-$5M
- $5M+

Order frequency:

- One Time
- Monthly
- Quarterly
- Yearly
- Continuous

Procurement method:

- RFQ Based
- Contract Manufacturing
- Reverse Auction
- Direct Purchase
- Repeat Orders

Import experience:

- No
- 1-2 Years
- 3-5 Years
- 5+ Years

Preferred incoterms:

- EXW
- FOB
- CIF
- DDP
- FCA
- CPT
- CIP

Preferred payment terms:

- Advance
- LC
- Net 30
- Net 60
- Net 90
- Escrow

### Step 3: Buyer Profile Completion

Collect trust and context signals.

Fields:

- Company logo upload
- Company description, max 500 characters
- Certifications upload
- LinkedIn
- Website
- Facebook
- Procurement team size

Procurement team size:

- 1-5
- 6-20
- 21-50
- 50+

Show buyer profile strength:

- Overall percentage
- Missing company logo
- Missing website
- Missing certifications

### Buyer Gates

Until email and phone are verified, the buyer cannot:

- Send RFQ
- Contact suppliers
- Save suppliers
- Post custom requirements

Server-side gates should be implemented in procurement/RFQ/saved supplier APIs, not only in UI.

## Seller Onboarding V3

### Flow Key

`seller_onboarding_v3`

### Step 0: GST Verification

GST verification is the first page.

Seller enters GST number, for example `24ADUPV1084A2ZF`.

System fetches:

- GST details
- Legal company name
- Trade name
- GST status
- GST registration date
- Constitution of business
- State
- City
- Address
- Pincode

Auto-filled GST fields should be read-only by default. Sellers may request correction, but corrected values must be reviewed.

Provider strategy:

- Recommended default: Signzy or Surepass.
- Secondary adapters: API Setu and Masters India.
- Keep provider selection behind `GST_API_PROVIDER`.
- Normalize all provider responses into the existing `GstLookupResult` contract and persist audit data.

### Step 1: Basic Information

Auto-filled after GST:

- Company name
- Registered address
- State
- City
- Pincode

Seller fills:

- Contact person name
- Designation
- Mobile number
- Mobile OTP
- Business email
- Email OTP
- Factory address
- Factory address same as registered address

### Step 2: Business Details

Fields:

- Seller type
- Main industry
- Capability category
- Dynamic sub-capabilities
- Materials
- Production capacity
- Countries exporting to
- Languages supported

Seller type:

- Manufacturer
- Exporter
- OEM
- Contract Manufacturer
- Job Work Provider
- Trader
- Distributor

Main industry:

- Industrial Goods by default
- Fashion and Textile as a future optional vertical

Capability categories:

- CNC Machining
- Casting
- Forging
- Sheet Metal
- Injection Molding
- Fabrication
- Extrusion
- Fasteners
- Rubber Molding
- Plastic Molding

Dynamic sub-capabilities:

- Casting: Sand Casting, Investment Casting, Die Casting, Gravity Casting
- CNC: CNC Turning, CNC Milling, VMC, HMC, Swiss Machining, EDM

Materials:

- Stainless Steel
- Carbon Steel
- Alloy Steel
- Aluminum
- Brass
- Copper
- Titanium
- Plastic
- Rubber
- Cast Iron

Production fields:

- Monthly capacity
- MOQ
- Lead time
- Factory area
- Shop floor employees
- Engineers
- QC team size

Languages:

- English
- Hindi
- German
- French
- Chinese
- Spanish

### Step 3: Bank and Financial Verification

Mandatory for seller activation.

Bank fields:

- Bank name
- Account holder name
- Account number
- Confirm account number
- IFSC code
- Branch name
- Cancelled cheque upload

Exporter fields:

- IEC number
- IEC document upload

PAN fields:

- PAN number
- PAN upload

Optional but recommended:

- Udyam number
- Udyam certificate

Mandatory:

- Factory license upload

Terms:

- Seller Agreement
- Terms and Conditions
- Privacy Policy
- KYC Consent

### Step 4: Registration Completion

Show:

- Congratulations message
- Business account created
- Profile completion percentage
- Benefits of completing profile:
  - Increase visibility
  - Rank higher in search
  - Get verified badge
  - Receive RFQs

Primary CTA:

- Complete Profile
- Redirect to `/dashboard/profile-completion`

### Step 5: Seller Profile Completion

This is optional but strongly recommended, and should heavily influence ranking.

Factory photos:

- Exterior
- Shop floor
- Machines
- QC department
- Warehouse
- Office
- Minimum 3
- Maximum 20

Machines list:

- Machine name
- Brand
- Model
- Quantity
- Capacity
- Year purchased

Certifications:

- ISO 9001
- ISO 14001
- ISO 45001
- IATF 16949
- AS9100
- CE
- PED

Certification fields:

- Certificate name
- Certificate number
- Expiry date
- Upload PDF

Export experience:

- Customer name
- Country
- Product exported
- Order value
- PO or invoice upload

Quality systems:

- PPAP
- APQP
- FMEA
- SPC
- MSA
- 5S
- Kaizen
- Lean Manufacturing

Factory tour:

- Video upload or Youtube URL

### Seller Hard Gates

Seller cannot become active until all are true:

- GST verified
- PAN uploaded
- Bank verified
- Factory license uploaded
- Email verified
- Mobile verified
- Terms accepted

Seller cannot rank in public supplier search or receive matched RFQs until activation thresholds are satisfied.

## Profile Completion Scoring

Buyer scoring should include:

- Company information
- Contact verification
- Procurement preferences
- Import/export preferences
- Profile assets
- Certifications

Seller scoring should include:

- Company information: 100%
- Business details: 100%
- Documents: 100%
- Factory information: weighted
- Machines: weighted
- Certifications: weighted
- Factory photos: weighted
- Export experience: weighted

Example display:

```text
Company Information      100%
Business Details         100%
Documents                100%
Factory Information       40%
Machines                  20%
Certifications            60%
Factory Photos            80%
Export Experience         50%
Overall Profile Score     78%
```

Scoring should be computed in service functions and persisted to completion tracking tables for dashboard and ranking performance.

## Trust and Fraud Prevention

### Verification Badges

Show professional status badges for:

- GST Verified
- Bank Verified
- Email Verified
- Mobile Verified
- Factory Verified
- Exporter Verified

Use Lucide icons and semantic colors, not emojis.

### Risk Signals

Flag and persist:

- GST mismatch
- Multiple accounts with same GST
- Fake documents
- Disposable email domains
- VPN abuse
- Temporary phone numbers
- OCR mismatch between uploaded documents and GST data
- Bank account holder mismatch
- PAN legal name mismatch
- Repeated failed OTP attempts

Risk signals should not automatically reject accounts. They should feed admin review, trust score, and activation gating.

## Data Model

### Reuse Existing Tables

- `profiles`
- `companies`
- `buyer_profiles`
- `seller_profiles`
- `onboarding_sessions`
- `supplier_addresses`
- `supplier_capabilities`
- `supplier_factory_details`
- `supplier_documents`
- `supplier_media`
- `supplier_verifications`
- `supplier_completion_tracking`
- `supplier_review_logs`
- `gst_verifications`
- `platform_events`

### Add Tables

#### `buyer_preferences`

Stores budget, frequency, procurement method, import experience, incoterms, payment terms, team size, and profile summary fields.

#### `buyer_industries`

Many-to-many buyer industry interests.

#### `buyer_category_interests`

Many-to-many buyer category interests.

#### `buyer_import_countries`

Countries the buyer has imported from or prefers.

#### `seller_kyc_verifications`

Stores normalized KYC checks for GST, PAN, IEC, bank, factory license, Udyam, and director KYC.

#### `seller_bank_details`

Stores masked bank verification data. Account numbers must be encrypted or tokenized where possible. Never expose raw account numbers back to clients.

#### `seller_capability_categories`

Maps sellers to capability categories.

#### `seller_sub_capabilities`

Maps sellers to dynamic process-level sub-capabilities.

#### `seller_materials`

Maps sellers to material families and grades.

#### `seller_machines`

Stores machine rows with name, brand, model, quantity, capacity, and year purchased.

#### `seller_certifications`

Stores certification metadata, expiry dates, documents, and review status. This can either extend or bridge into existing public `supplier_certifications`.

#### `seller_export_experience`

Stores customer, country, product, order value, and proof document reference.

#### `seller_quality_systems`

Maps sellers to quality systems such as PPAP, APQP, FMEA, SPC, MSA, 5S, Kaizen, and Lean.

#### `marketplace_risk_signals`

Stores risk events with actor, role, resource, severity, rule key, evidence JSON, status, and reviewer fields.

## API Design

Use REST endpoints with resource-oriented names and consistent validation.

Buyer:

- `GET /api/onboarding/buyer`
- `PATCH /api/onboarding/buyer/session`
- `POST /api/onboarding/buyer/commit`
- `GET /api/onboarding/buyer/status`

Seller:

- `GET /api/onboarding/seller`
- `PATCH /api/onboarding/seller/session`
- `POST /api/onboarding/seller/gst/verify`
- `POST /api/onboarding/seller/bank/verify`
- `POST /api/onboarding/seller/commit`
- `GET /api/onboarding/seller/status`

Verification:

- `POST /api/otp/send`
- `POST /api/otp/verify`
- `POST /api/uploads`

Errors should use a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please complete all mandatory fields.",
    "details": {}
  }
}
```

## Auth and Authorization

Required controls:

- Authenticated user required for onboarding.
- Buyer users can only read/write their own buyer onboarding session.
- Seller users can only read/write their own seller onboarding session.
- Admin and supplier success roles can review verification records.
- Server-side gates must protect RFQ creation, supplier contact, saved supplier creation, seller activation, public search eligibility, and RFQ matching.
- OTP endpoints require rate limiting and attempt tracking.
- Sensitive KYC tables must use strict RLS and avoid public read policies.

## Frontend Design

### Layout

Use a premium industrial B2B wizard:

- Desktop: left stepper, main form, right trust/completion panel.
- Tablet: top stepper with compact side summary.
- Mobile: top progress rail, single-column form, sticky bottom save/continue.

### UI Rules

- Use Lucide icons.
- Avoid emoji UI.
- Use restrained neutral surfaces with semantic green, amber, red, and blue only for statuses.
- Use 44px minimum touch targets.
- Every input has a label.
- Upload rows show file state, retry, and review status.
- Buttons show loading and disabled states.
- Save draft must be visible and autosave must show status.
- Progress should not jump due to hover, upload labels, or validation messages.

### Key Components

- `OnboardingWizardShell`
- `OnboardingStepNav`
- `OnboardingProgressRail`
- `VerificationBadgeList`
- `ProfileStrengthPanel`
- `AutosaveStatus`
- `OtpVerificationField`
- `MultiSelectField`
- `CapabilitySelector`
- `DocumentUploadRow`
- `MachineListEditor`
- `CertificationEditor`
- `ExportExperienceEditor`
- `RiskNotice`

## SEO and Marketplace Impact

Authenticated onboarding pages do not need public indexing. SEO impact comes from committed supplier data:

- Supplier public profile metadata
- Supplier search filters
- Capability/category pages
- Structured trust badges
- Verified certification display
- Factory and capability details

Do not expose private KYC fields publicly.

## AI and CRM Readiness

Onboarding v3 should produce structured signals for:

- AI supplier matching
- RFQ recommendation engine
- Search filters
- Supplier ranking
- Verified supplier badges
- Global supplier directory
- CRM segmentation
- Lead scoring

Key matching dimensions:

- Buyer industry
- Buyer categories
- Buyer budget
- Buyer frequency
- Buyer incoterms
- Buyer payment terms
- Seller capabilities
- Seller sub-capabilities
- Seller materials
- Seller production capacity
- Seller export markets
- Seller certifications
- Seller quality systems
- Seller trust status

## Observability

Emit `platform_events` for:

- onboarding_started
- onboarding_step_saved
- onboarding_step_completed
- gst_verification_requested
- gst_verification_failed
- gst_verification_succeeded
- otp_requested
- otp_verified
- document_uploaded
- bank_verification_requested
- seller_submitted_for_review
- buyer_profile_completed
- risk_signal_created

Metrics:

- Step completion rate
- Drop-off by step
- GST verification failure rate
- OTP failure rate
- Average time to seller activation
- Buyer verification conversion
- Seller profile completion distribution

## Rollout Plan

1. Add database migration for v3 tables and indexes.
2. Add shared constants and validation schemas.
3. Add onboarding session service support for `buyer_onboarding_v3` and `seller_onboarding_v3`.
4. Add GST verification endpoint and provider adapter.
5. Add seller KYC/bank/document commit services.
6. Add buyer commit services.
7. Replace buyer wizard UI.
8. Replace seller wizard UI.
9. Add profile completion dashboard.
10. Add server-side gates to RFQ, contact, saved suppliers, seller activation, search eligibility, and RFQ matching.
11. Add admin review visibility for new KYC/risk signals.
12. Backfill existing users into v3 where possible or keep them on legacy flows until they edit profile.

## Testing Strategy

Unit tests:

- Buyer completion scoring
- Seller completion scoring
- GST result normalization
- Gate checks
- Risk signal rules
- Validation schemas

Integration tests:

- Save draft
- Resume draft
- Commit buyer onboarding
- Commit seller onboarding
- GST verification success/failure
- OTP success/failure
- Upload document
- Seller activation blocked until required verifications are complete

UI checks:

- Desktop layout
- Mobile layout
- Error states
- Loading states
- Upload states
- OTP states
- Keyboard navigation
- No horizontal mobile overflow

## Open Implementation Decisions

1. Choose live GST/KYC provider: Signzy or Surepass is recommended for a unified KYC future.
2. Decide whether bank account verification is live in phase 1 or stored as pending review until provider integration.
3. Decide whether legacy sellers are forced through v3 or prompted progressively.
4. Decide whether public supplier ranking uses v3 profile score immediately or after a calibration period.

## Implementation Approval Gate

This spec is ready for implementation planning. No code should be changed for onboarding v3 until the spec is reviewed and approved.
