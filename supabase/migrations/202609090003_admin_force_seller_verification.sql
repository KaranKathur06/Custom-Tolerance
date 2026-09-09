-- Persist the administrator's explicit verification override separately from
-- document-level verification so seller access can be granted consistently.

alter table if exists public.seller_profiles
  add column if not exists admin_verified boolean not null default false;

create index if not exists seller_profiles_admin_verified_idx
  on public.seller_profiles(admin_verified)
  where admin_verified = true;