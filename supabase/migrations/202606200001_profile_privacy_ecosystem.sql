-- Profile privacy, buyer discovery, and contact unlock foundation

do $$
begin
  create type public.profile_visibility_level as enum ('PUBLIC', 'MEMBERS_ONLY', 'PRIVATE');
exception
  when duplicate_object then null;
end $$;

-- Per-user field visibility (seller + buyer)
create table if not exists public.profile_privacy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('seller', 'buyer')),
  field_key text not null,
  visibility public.profile_visibility_level not null default 'PRIVATE',
  updated_at timestamptz not null default now(),
  unique (user_id, role, field_key)
);

create index if not exists idx_profile_privacy_user_role
  on public.profile_privacy_settings (user_id, role);

alter table public.profile_privacy_settings enable row level security;

create policy "profile_privacy_owner_rw"
  on public.profile_privacy_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Buyer public discovery (mirrors suppliers)
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  buyer_profile_id uuid references public.buyer_profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  display_name text not null,
  company_name text,
  slug text not null unique,
  short_description text,
  logo_url text,
  banner_url text,
  country text,
  state text,
  city text,
  buyer_type text,
  industries text[] default '{}',
  procurement_categories text[] default '{}',
  profile_completeness numeric(5,2) not null default 0 check (profile_completeness between 0 and 100),
  verification_status public.verification_status not null default 'unverified',
  is_published boolean not null default false,
  is_disabled boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_buyers_slug on public.buyers (slug);
create index if not exists idx_buyers_published on public.buyers (is_published, is_disabled, is_suspended);

alter table public.buyers enable row level security;

create policy "buyers_public_read"
  on public.buyers
  for select
  using (
    is_published = true
    and is_disabled = false
    and is_suspended = false
  );

create policy "buyers_owner_rw"
  on public.buyers
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Contact unlock: seller approves buyer to see hidden contact fields
create table if not exists public.contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles(id) on delete cascade,
  buyer_user_id uuid not null references public.profiles(id) on delete cascade,
  inquiry_id uuid,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  unlocked_fields text[] not null default '{mobile,email,whatsapp}',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  unique (seller_user_id, buyer_user_id, inquiry_id)
);

create index if not exists idx_contact_unlocks_seller_buyer
  on public.contact_unlocks (seller_user_id, buyer_user_id, status);

alter table public.contact_unlocks enable row level security;

create policy "contact_unlocks_participants_read"
  on public.contact_unlocks
  for select
  using (auth.uid() = seller_user_id or auth.uid() = buyer_user_id);

create policy "contact_unlocks_seller_manage"
  on public.contact_unlocks
  for all
  using (auth.uid() = seller_user_id)
  with check (auth.uid() = seller_user_id);

-- Persist completion sections (schema existed but unused)
alter table public.profile_completion
  add column if not exists role text check (role in ('seller', 'buyer'));

comment on table public.profile_privacy_settings is 'Field-level visibility per user for public profile rendering';
comment on table public.buyers is 'Public buyer discovery records — slug-indexed, SEO-friendly';
comment on table public.contact_unlocks is 'Per-buyer contact field unlock after inquiry approval';
