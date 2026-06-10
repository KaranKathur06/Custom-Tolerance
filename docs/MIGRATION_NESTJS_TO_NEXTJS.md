# NestJS → Next.js Migration Log

**Platform:** CustomTolerance  
**Completed:** June 2026  
**Status:** Production-ready single-deployment architecture

## Timeline Executed

| Phase | Window | Deliverable | Status |
|-------|--------|-------------|--------|
| 1–2 | Day 1 | Forensic audit + dependency matrix | ✅ Complete |
| 3 | Day 1 | Prisma ops dashboards → Supabase | ✅ `lib/ops/supabase-metrics.ts` |
| 5 | Day 1–2 | Payment routes in Next.js | ✅ `/api/payment/*` |
| 6 | Day 2 | Uploads wired to Supabase Storage | ✅ Onboarding + `factory-photos` bucket |
| 8 | Day 1 | `.env.example` unified config | ✅ |
| 9 | Day 1 | Target architecture documented | ✅ This doc |
| 10 | Day 2 | Dead code removed | ✅ `proxy.ts`, `client.ts`, `fetchBackend` |
| 11 | Day 2 | `npm run build` verification | ✅ |
| 12 | Day 2 | NestJS archived | ✅ `archive/backend-nestjs/` |

## Target Architecture

```
Vercel (Next.js 14)
  ├── app/          Pages + API routes
  ├── lib/          Business logic
  └── middleware.ts Auth + RBAC

Supabase
  ├── Auth
  ├── PostgreSQL + RLS
  └── Storage
```

## Deprecated (removed from active path)

- NestJS `backend/` → archived
- `lib/api/proxy.ts`
- `NEXT_PUBLIC_API_URL` / `localhost:5000`
- JWT auth via NestJS
- Redis (replaced by Supabase `rate_limits` table)

## NestJS features not migrated (intentionally)

| Feature | Reason | Replacement |
|---------|--------|-------------|
| Listing price offers | No UI consumer | Deprecate or rebuild later |
| Listing-scoped chat | Different model | `message_threads` (RFQ-based) |
| WhatsApp OTP via Twilio | Not in product path | Mobile OTP via `/api/supplier/verification/otp` |
| Google/Apple OAuth stubs | Never implemented | Supabase OAuth |

## Rollback

1. Restore `archive/backend-nestjs/` to `backend/`
2. Set `NEXT_PUBLIC_API_URL=http://localhost:5000`
3. Restore `lib/api/proxy.ts` from git history
4. Redeploy NestJS separately (not on Vercel)

## Sign-off Checklist

- [x] No live frontend calls to NestJS
- [x] Ops dashboards use Supabase only
- [x] Build passes
- [x] Backend archived (not deleted from git history)
- [ ] Staging regression test by QA
- [ ] Production deploy verification
