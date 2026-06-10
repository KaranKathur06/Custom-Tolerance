# Email OTP Verification Architecture

## Overview

CustomTolerance signup email verification uses **Supabase native OTP** (`resend` + `verifyOtp`) with an application security layer for rate limiting, attempt tracking, and audit logging.

**Users never click email links.** They enter a 6-digit code on `/verify-email`.

## Target Flow

```
Register → /verify-email → 6-digit OTP email → Enter OTP → Auto Login → Onboarding
```

## What Supabase Owns (Do NOT Duplicate)

| Concern | Owner |
|---------|-------|
| OTP token generation | Supabase Auth (`auth.users`, internal OTP store) |
| OTP expiry (default ~1h, configure to 10 min in dashboard) | Supabase Auth |
| `email_confirmed_at` timestamp | Supabase Auth |
| Email delivery (SMTP/Resend via Supabase) | Supabase Auth email templates |
| Session/JWT after `verifyOtp` | Supabase Auth |
| Password reset magic links | Unchanged — still link-based |
| Invite user flow | Unchanged — Supabase invite emails |
| OAuth (Google) signup | Unchanged — auto-confirmed via provider |

## Application Security Layer

| Table | Purpose |
|-------|---------|
| `verification_attempts` | Failed attempt counter (max 5), lockout |
| `otp_events` | OTP lifecycle audit (`otp_sent`, `otp_verified`, `otp_failed`, etc.) |
| `security_logs` | Broader auth security events |
| `otp_resend_cooldowns` | 60-second resend protection per email |
| `rate_limits` | Existing table — IP+email rate limits for send/resend |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/verify-email/send` | POST | Send OTP via `supabase.auth.signInWithOtp()` |
| `/api/auth/verify-email/resend` | POST | Resend via `signInWithOtp` + cooldown + rate limit |
| `/api/auth/verify-email/verify` | POST | `verifySignupOtp()` (signup + email types) + session cookies |
| `/api/auth/verify-email/ack` | POST | Record signUp-triggered send (no duplicate email) |

## Frontend Components

| File | Role |
|------|------|
| `app/verify-email/page.tsx` | Verification page |
| `components/auth/EmailVerificationCard.tsx` | Premium B2B verification card |
| `components/auth/OtpInput.tsx` | 6-box OTP input (auto-advance, paste, mobile) |
| `lib/hooks/useEmailVerification.ts` | Client orchestration hook |

## Supabase Dashboard Configuration (Required)

### 1. Confirm Email Template → OTP

In **Authentication → Email Templates → Confirm signup**, paste the branded template from `supabase/templates/confirm-signup-otp.html` (uses `{{ .Token }}` for the 6-digit OTP — no confirmation button).

### 2. OTP Length (Critical)

In **Authentication → Providers → Email**, set **OTP length to 6 digits**.

If Supabase sends 8-digit codes (e.g. `17297962`) while the app expects 6, verification will always fail after the 503 fix. The app uses `OTP_CONFIG.LENGTH = 6` everywhere.

### 3. OTP Expiry

In **Authentication → Providers → Email**, set OTP expiry to **600 seconds (10 minutes)**.

### 4. Vercel Environment Variables (Required for security layer)

| Variable | Required for verify | Purpose |
|----------|---------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `verifyOtp` + session cookies |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Rate limits, audit logs, user lookup |

Without `SUPABASE_SERVICE_ROLE_KEY`, verification still works via the anon client, but rate limiting and audit logging are disabled.

### 5. Site URL

Ensure **Site URL** matches production (`https://customtolerance.com`). No redirect URL needed for OTP flow.

### 6. Keep Unchanged

- **Reset password** template — still uses `{{ .ConfirmationURL }}`
- **Invite user** template — still uses magic link
- **Email change** template — unchanged

## Migration Strategy

| User Cohort | Behavior |
|-------------|----------|
| Existing verified users | Unaffected — `email_confirmed_at` already set |
| Existing unverified users | Login → redirected to `/verify-email` → OTP resend |
| New registrations | OTP flow only — no link verification UI |
| OAuth users | Skip verification — provider confirms email |
| Password reset | Unchanged |
| Admin 2FA | Unchanged — separate custom OTP system |

**Zero downtime:** Deploy code + run migration + update Supabase email template. Old magic links in inboxes still work until they expire.

## Error Handling

| Error | User Message |
|-------|--------------|
| Wrong OTP | Invalid verification code. |
| Expired OTP | Code expired. Request a new one. |
| 5 failed attempts | Too many attempts. Please request a new code. |
| Resend cooldown | Resend available in: Ns |
| Network failure | Unable to verify. Check your connection. |

## Security Model

- **Brute force:** 5 attempts per email → 15-minute lockout
- **Resend spam:** 60s cooldown + 5 sends per 30 min per IP+email
- **Audit:** All events in `otp_events` + `security_logs`
- **Session:** HttpOnly cookies via `@supabase/ssr` after successful verify
- **RLS:** Security tables service-role only

## Scalability Notes

- Stateless API routes — scales on Vercel/serverless
- DB-backed rate limits — works across instances (no Redis required)
- `cleanup_verification_security_data()` — schedule via pg_cron for retention
- At 10K+ suppliers: index on `otp_events(lower(email), created_at)` supports audit queries

## Files Modified

- `app/register/page.tsx` — redirect to OTP verification
- `app/login/page.tsx` — unverified → `/verify-email`
- `middleware.ts` — `/verify-email` route handling
- `lib/constants/routes.ts` — API route constants
- `lib/auth/rate-limiter.ts` — `SIGNUP_OTP_SEND` profile

## Files Created

- `supabase/migrations/202606100002_email_otp_verification.sql`
- `lib/auth/verification-security.ts`
- `lib/auth/route-handler-client.ts`
- `app/verify-email/page.tsx`
- `app/api/auth/verify-email/{send,resend,verify,ack}/route.ts`
- `components/auth/OtpInput.tsx`
- `components/auth/EmailVerificationCard.tsx`
- `lib/hooks/useEmailVerification.ts`
