# CT-IRFQ™ — CustomTolerance Intelligent RFQ Ecosystem

Date: 2026-06-20  
Status: Approved for phased implementation  
Owner: Product Architecture

## Summary

CT-IRFQ transforms CustomTolerance from a simple RFQ form into an AI-assisted, subscription-driven, manufacturing-specific procurement platform with smart supplier matching, risk intelligence, and enterprise collaboration.

The implementation extends the existing P0 foundation (`202606200002_irfq_foundation.sql`, `/api/v2/rfqs/*`, `IrfqComposerShell`) rather than replacing it.

## Current System Findings

### Existing Strengths

- CT-IRFQ P0 schema: multi-item RFQs, reference datasets, matching tables, subscription gates
- 8-step composer with 10 creation methods (gated by plan)
- Rule-based `match_suppliers_to_rfq` RPC on publish
- Draft/publish lifecycle with usage counters
- File upload pipeline with virus scan and AI extraction columns

### Gaps Addressed in This Spec

- Subscription plan not reflected in composer UI (hardcoded `free`)
- Razorpay webhook does not upgrade memberships
- No capability matrix matching (machine-level filters)
- No RFQ risk indicator engine
- No collaboration workspace
- AI pipeline schema-only (no workers or confidence UI)
- Advanced supplier filters not enforced in matching RPC

## Architecture

```
Buyer UI (Composer 8-step + Method Selector)
    ↓
Next.js API /api/v2/rfqs/*
    ↓
Supabase PostgreSQL + Storage + RLS
    ↓
Async Workers (AI extract, virus scan, match notify)
```

## Three Strategic Differentiators

### 1. Supplier Capability Matrix

Buyers filter by machines (3-axis CNC, 5-axis, EDM), max part size, min tolerance, capacity, and inspection equipment — not just turnover/employees.

Tables: `ref_machine_types`, `ref_inspection_equipment`, `supplier_capability_matrix`, `rfq_capability_requirements`.

### 2. RFQ Risk Indicator

AI/rules engine scores RFQ success probability before publish. Factors: unrealistic tolerance, short delivery, low budget, rare material, limited supplier pool.

Table: `rfq_risk_assessments`. Service: `lib/marketplace/irfq/risk-scoring.ts`.

### 3. RFQ Collaboration Workspace

Internal team comments, approvals, version history, activity timeline for Enterprise buyers.

Tables: `rfq_collaborators`, `rfq_comments`, `rfq_versions`, `rfq_approvals`.

## Composer Steps

| Step | Name | Key Fields |
|------|------|------------|
| -1 | Method | 10 creation methods, plan-gated |
| 0 | Category | Capability search, industry |
| 1 | Project | Name, title, type, industry |
| 2 | Drawings | Upload + AI confidence panel |
| 3 | Items | Single/multi line items |
| 4 | Quality | Supplier qual + advanced filters + capability matrix |
| 5 | Location | Geo cascade, delivery, incoterms |
| 6 | Commercial | Payment, currency, deadlines |
| 7 | Review | Risk indicator + privacy + publish |

## Subscription Plans

| Feature | Free | Premium | Enterprise |
|---------|------|---------|------------|
| RFQs/month | 3 | Unlimited | Unlimited |
| Supplier matches | 5 | Unlimited | Unlimited |
| Advanced filters | No | Yes | Yes |
| Capability matrix | No | Yes | Yes |
| AI creation | No | Yes | Yes |
| Collaboration | No | View | Full |
| API/ERP | No | No | Yes |

## API Endpoints (v2)

- `GET /api/v2/rfqs/subscription/plan` — plan, limits, usage
- `GET /api/v2/rfqs/[id]/risk` — risk assessment
- `POST /api/v2/rfqs/[id]/risk/simulate` — what-if simulations
- `GET/POST /api/v2/rfqs/[id]/collaborators` — team access
- `GET/POST /api/v2/rfqs/[id]/comments` — threaded comments
- `GET /api/v2/rfqs/[id]/activity` — activity timeline
- Existing: drafts, items, files, publish, matches, reference-data

## Matching Algorithm (Enhanced)

Weighted scoring (100 pts):

- Capability overlap: 20
- Capability matrix fit: 15
- Material match: 10
- Industry: 8
- Certifications: 10
- Supplier requirements: 10
- Location: 10
- MOQ/capacity: 7
- Performance history: 10
- Financial stability: 5
- Past similarity: 5 (Phase 2 ML)

## Security

- MIME whitelist, macro blocking, 5GB quota
- Virus scan before AI processing
- Prompt injection sanitization for AI inputs
- RLS on all RFQ tables
- Rate limits on AI endpoints
- Audit log on publish, match, approval

## Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| P0 | Schema, draft API, basic composer | Done |
| P1 | Subscription API, plan in UI, webhook → membership | This sprint |
| P2 | Risk engine + indicator UI | This sprint |
| P3 | Capability matrix tables, filters, matching | This sprint |
| P4 | Collaboration workspace API + page | This sprint |
| P5 | AI file pipeline workers | Next |
| P6 | Conversational + BOM + Quick RFQ | Next |
| P7 | Enterprise API + ERP | Next |

## Migration

`supabase/migrations/202606200003_irfq_premium_ecosystem.sql`
