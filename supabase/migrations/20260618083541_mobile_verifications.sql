-- CustomTolerance Mobile Verification Trust Layer
-- System-owned seller/buyer mobile OTP sessions. Users can request and submit
-- OTPs, but they can never mark a phone number as verified themselves.

create extension if not exists pgcrypto;

create table if not exists public.mobile_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null default '+91',
  mobile_number text not null,
  otp_hash text,
  otp_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  verified boolean not null default false,
  verified_at timestamptz,
  resend_count integer not null default 0 check (resend_count >= 0),
  resend_window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, country_code, mobile_number)
);

create index if not exists mobile_verifications_user_idx on public.mobile_verifications(user_id);
create index if not exists mobile_verifications_mobile_idx on public.mobile_verifications(country_code, mobile_number);
create index if not exists mobile_verifications_verified_idx on public.mobile_verifications(verified, verified_at desc);

drop trigger if exists mobile_verifications_set_updated_at on public.mobile_verifications;
create trigger mobile_verifications_set_updated_at
before update on public.mobile_verifications
for each row execute function public.set_updated_at();

alter table public.mobile_verifications enable row level security;

drop policy if exists mobile_verifications_own_read on public.mobile_verifications;
create policy mobile_verifications_own_read on public.mobile_verifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin_role());

drop policy if exists mobile_verifications_own_insert on public.mobile_verifications;
create policy mobile_verifications_own_insert on public.mobile_verifications
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin_role());

drop policy if exists mobile_verifications_own_update on public.mobile_verifications;
create policy mobile_verifications_own_update on public.mobile_verifications
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin_role())
  with check (user_id = auth.uid() or public.is_admin_role());
