# CustomTolerance API Routes

All API routes live under `app/api/` and run on Vercel as Next.js Route Handlers.

## Architecture

```
Browser → Next.js app/api/* → Supabase (Auth + PostgreSQL + Storage)
```

There is **no separate NestJS backend**. Do not set `NEXT_PUBLIC_API_URL`.

## Authentication

- Session: Supabase Auth cookies (`@supabase/ssr`)
- Route protection: `lib/auth/protect-route.ts`
- Admin 2FA: `/api/admin/otp/*` + `admin_verified` cookie
- Row-level security: Supabase RLS policies

## Environment

See `.env.example` at the repository root.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only routes)

## Key route groups

| Prefix | Purpose |
|--------|---------|
| `/api/admin/*` | Admin dashboard, moderation, CMS |
| `/api/ops/*` | Operations & verification queues |
| `/api/supplier/*` | Supplier onboarding & verification |
| `/api/onboarding/*` | Buyer/seller onboarding sessions |
| `/api/marketplace/*` | Public marketplace search |
| `/api/uploads` | Supabase Storage uploads |
| `/api/payment/*` | Razorpay (optional, env-gated) |

## Adding a new route

1. Create `app/api/your-feature/route.ts`
2. Use `protectApiRoute()` for authenticated endpoints
3. Query Supabase via `auth.supabase` — do not add external API proxies
