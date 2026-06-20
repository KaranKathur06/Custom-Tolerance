# Temporary Full-Access Admin Review Link

## Summary

Provide Claude with a full-fidelity admin session for reviewing the test-mode admin panel for 24 hours. The review session must use the normal Supabase authentication, role, permission, API, and audit paths so protected pages behave exactly as they do for an administrator. It must not introduce a generic authentication or service-role bypass.

The session belongs to a dedicated reviewer identity rather than an existing human administrator. Access is bootstrapped from a secret URL, expires at an explicit timestamp, can be disabled immediately, and is denied at both page middleware and protected API boundaries after expiration.

## Goals

- Allow the reviewer to navigate every `/ops` and `/admin` page.
- Allow the reviewer to call protected admin APIs and exercise mutations against demo data.
- Preserve application RBAC, RLS behavior, admin-session checks, rate limits, and audit logging.
- Attribute review actions to a dedicated reviewer identity.
- Expire access after 24 hours and support immediate revocation.
- Keep bootstrap secrets out of source control and browser-visible application code.

## Non-goals

- This is not anonymous or public admin access.
- This does not bypass Supabase RLS with the service-role client for ordinary admin requests.
- This does not give the reviewer an existing administrator's identity.
- This does not provide permanent reviewer-account lifecycle automation or a general invitation system.
- This does not change admin UI design or demo data.

## Selected Approach

Create a dedicated Supabase reviewer identity, a minimal public exchange page, and a server-only bootstrap endpoint. A valid exchange establishes a real Supabase session, creates a valid elevated admin session, writes the existing `admin_verified` cookie, and sends the browser to `/ops/admin` without transmitting the raw secret in a request URL.

The dedicated identity uses `super_admin` authorization because the requested review includes all current admin surfaces and protected APIs. Existing RBAC and audit code remain authoritative. The reviewer is additionally identified by a server-controlled `app_metadata.review_access` marker and configured email so expiration checks cannot be activated by user-editable metadata.

## Configuration

The deployment supplies server-only values:

- `ADMIN_REVIEW_ACCESS_ENABLED`: exact string `true` enables bootstrap and active reviewer sessions.
- `ADMIN_REVIEW_ACCESS_KEY_HASH`: SHA-256 hash of a cryptographically random bootstrap key. The raw key appears only in the URL shared with the reviewer.
- `ADMIN_REVIEW_ACCESS_EXPIRES_AT`: an ISO-8601 UTC timestamp no more than 24 hours after activation.
- `ADMIN_REVIEWER_EMAIL`: the dedicated review identity email.

The feature fails closed if any value is missing, invalid, expired, or inconsistent. None of these values use a `NEXT_PUBLIC_` prefix.

## Components

### Review-access policy

An edge-compatible module owns configuration parsing and policy decisions:

- Detect whether a Supabase user is the dedicated reviewer from trusted `app_metadata` plus the configured email.
- Determine whether review access is currently enabled and unexpired.
- Validate that the configured expiry is a valid future timestamp.
- Return a stable denial reason for disabled, expired, or misconfigured access.

The browser never decides whether access is valid.

### Public exchange page

A minimal page at `/admin-review#key=<raw-key>` receives the bearer secret in the URL fragment. URL fragments are not sent in HTTP requests and therefore do not appear in normal hosting access logs. The client page:

1. Reads the key from `window.location.hash`.
2. Immediately removes the fragment using `history.replaceState`.
3. Sends the key in the JSON body of a same-origin `POST /api/admin/review-access` request with credentials enabled.
4. Navigates to the returned `/ops/admin?review=active` location after success.
5. Shows a generic expired or denied message on failure.

The page contains no admin data or controls and is intentionally outside the `/admin` middleware prefix.

### Bootstrap endpoint

A Node.js route handles `POST /api/admin/review-access`:

1. Reject requests when the feature is disabled, expired, or misconfigured.
2. Require a same-origin request and a JSON content type.
3. Hash the supplied key with SHA-256 and compare its bytes with the configured hash using a timing-safe comparison.
4. Apply a strict attempt rate limit by client IP before provisioning or authentication work.
5. Create the dedicated Supabase Auth user if absent, or verify that the existing user is the marked reviewer identity.
6. Store authorization only in `app_metadata`; never trust `user_metadata` for the reviewer role or marker.
7. Ensure the authoritative `profiles.role` value is `super_admin`.
8. Generate a one-time Supabase magic-link credential server-side and immediately verify it through a purpose-built cookie-aware Supabase SSR client, producing a normal browser session without requiring mailbox access.
9. Create an `admin_sessions` record through the existing elevated-session helper.
10. Set the existing HTTP-only `admin_verified` cookie, bounded by the earlier of the normal four-hour admin-session duration and review expiry.
11. Return the fixed `/ops/admin?review=active` destination to the exchange page.

The endpoint returns `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. Errors do not reveal whether the key, reviewer account, or individual configuration field was wrong. It must not use the current shared `createSupabaseServerClient` for session issuance because that helper deliberately ignores `setAll`; the bootstrap route owns a response-bound SSR client whose `setAll` writes Supabase cookies to its `NextResponse`.

The bootstrap link remains usable until the configured 24-hour expiry. Each elevated admin session retains the application's existing four-hour maximum, so the reviewer can reopen the same link to continue within the approved review window.

### Page middleware enforcement

The current middleware continues to require a real Supabase user for `/ops` and `/admin`. When the user is the marked reviewer, middleware additionally checks the review-access policy on every matched request.

If access has expired or been disabled, middleware clears the Supabase and admin-verification cookies where supported and redirects to `/login?reviewExpired=1`. Normal users are unaffected.

### Protected API enforcement

`protectApiRoute` applies the same reviewer-access policy after `supabase.auth.getUser()` and before role, permission, 2FA, rate-limit, or data work. An inactive reviewer receives `403 REVIEW_ACCESS_EXPIRED`.

This second enforcement point is required because page middleware does not match every `/api/admin` or `/api/ops` route. It prevents a previously issued access token from continuing to mutate data after the review window closes.

### Audit identity

The reviewer receives a stable, dedicated Supabase user ID. Existing `logAdminAction` calls therefore attribute mutations to the reviewer rather than the owner's account. The bootstrap endpoint emits a security audit event when access is successfully established and logs failed bootstrap attempts without recording the raw key.

## Data and Trust Boundaries

- The raw bootstrap key is a bearer secret and must be shared only with Claude for this review. It is placed in the URL fragment, not the query string.
- Only the hash is stored in deployment configuration.
- The Supabase service-role client is limited to reviewer provisioning and magic-link generation inside the bootstrap endpoint.
- Subsequent requests use the reviewer's ordinary Supabase session and remain subject to normal application authorization and RLS.
- Authorization values come from `profiles.role` and trusted `app_metadata`, not `user_metadata`.
- Existing admin-session records and cookies remain part of the normal 2FA/elevation path.

## Failure Handling

- Missing configuration, a malformed expiry, or a disabled flag returns a generic unavailable response.
- Invalid, missing, or rate-limited keys return a generic denied response.
- Reviewer-account conflicts fail closed; the endpoint must not repurpose an unrelated user with the same email.
- Failure to update the profile, create a session, or write elevation state aborts the bootstrap and clears any partially issued browser session.
- Expired review users are denied by middleware and APIs even if a Supabase refresh token remains valid.
- Normal admin login and the existing temporary super-admin OTP bypass continue unchanged.

## Security and Operational Controls

- Use at least 32 random bytes for the raw bootstrap key.
- Set the expiry to an explicit UTC timestamp no later than 24 hours after enablement.
- Use HTTP-only, secure production cookies with `SameSite=Lax`.
- Do not log the raw key, generated magic-link token, access token, refresh token, or cookie contents.
- Do not place secrets in `.env.example`; document variable names and placeholder formats only.
- Revoke early by setting `ADMIN_REVIEW_ACCESS_ENABLED=false` and redeploying/restarting.
- After review, delete or ban the dedicated reviewer user as cleanup; the runtime guards remain the immediate revocation boundary.

## Verification

### Automated checks

- Policy parsing rejects missing, invalid, disabled, and expired configuration.
- Key comparison accepts only the configured key and does not accept prefix or encoding variants.
- Bootstrap rejects invalid and rate-limited requests without creating users or sessions.
- Successful bootstrap returns a fixed destination without the key and sets Supabase plus admin-verification cookies.
- Reviewer requests pass `/ops`, `/admin`, and protected admin API authorization before expiry.
- Reviewer page and API requests fail after expiry or disablement.
- A normal admin and a normal non-admin follow their existing behavior unchanged.
- Protected mutations are attributed to the reviewer user ID.

### Manual end-to-end check

1. Configure a short test window and deploy the exchange page and endpoint.
2. Open the bootstrap URL in a clean browser profile.
3. Confirm redirect to `/ops/admin` and navigation across admin and CRM workspaces.
4. Exercise representative read and write actions against demo data.
5. Confirm audit entries use the dedicated reviewer identity.
6. Disable access and confirm both page navigation and direct API calls are denied.
7. Re-enable with an already expired timestamp and confirm fail-closed behavior.

## Rollout and Cleanup

The implementation is additive and environment-gated. Deploy with the flag disabled, configure the reviewer email, key hash, and expiry, then enable it for the review window. Share the raw bootstrap URL once. After review, disable the flag immediately and delete or ban the dedicated reviewer account when convenient.
