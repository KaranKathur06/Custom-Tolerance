alter table if exists public.profiles
  add column if not exists enforcement_status text not null default 'normal',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists suspension_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references auth.users(id) on delete set null,
  add column if not exists ban_reason text;

alter table if exists public.profiles
  drop constraint if exists profiles_enforcement_status_check;

alter table if exists public.profiles
  add constraint profiles_enforcement_status_check
  check (enforcement_status in ('normal', 'suspended', 'banned'));

create index if not exists profiles_enforcement_status_idx
  on public.profiles(enforcement_status);