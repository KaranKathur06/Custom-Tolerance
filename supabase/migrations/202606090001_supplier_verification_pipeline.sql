-- CustomTolerance Supplier Verification Pipeline
-- Enterprise onboarding, verification, trust scoring, and anti-abuse foundation.
-- Prerequisites: public.seller_profiles, public.companies, public.profiles,
-- and public.mh_verification_status (from development_trust_foundation migration).

-- ── Ensure prerequisite enum exists ─────────────────────────────────────────
do $$
begin
  create type public.mh_verification_status as enum ('draft', 'pending', 'in_review', 'approved', 'rejected', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if to_regclass('public.seller_profiles') is null then
    raise exception 'Missing table public.seller_profiles. Run 202605060001_development_trust_foundation.sql first.';
  end if;
end $$;

-- ── Onboarding status enum ──────────────────────────────────────────────────
do $$
begin
  create type public.supplier_onboarding_status as enum (
    'REGISTERED',
    'PROFILE_INCOMPLETE',
    'PROFILE_SUBMITTED',
    'UNDER_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
  );
exception
  when duplicate_object then null;
end $$;

-- ── Extend companies ────────────────────────────────────────────────────────
alter table if exists public.companies
  add column if not exists legal_business_name text,
  add column if not exists company_description text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists pincode text,
  add column if not exists full_address text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists google_maps_url text,
  add column if not exists number_of_employees text,
  add column if not exists year_established integer;

alter table if exists public.companies
  add column if not exists email_verified boolean default false;

alter table if exists public.companies
  add column if not exists phone_verified boolean default false;

update public.companies
set email_verified = false
where email_verified is null;

update public.companies
set phone_verified = false
where phone_verified is null;

alter table if exists public.companies
  alter column email_verified set default false,
  alter column email_verified set not null;

alter table if exists public.companies
  alter column phone_verified set default false,
  alter column phone_verified set not null;

create unique index if not exists companies_gst_number_unique_idx
  on public.companies(gst_number)
  where gst_number is not null and deleted_at is null;

-- ── Extend seller_profiles ──────────────────────────────────────────────────
alter table if exists public.seller_profiles
  add column if not exists onboarding_status public.supplier_onboarding_status default 'REGISTERED',
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists change_request_notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists review_status public.mh_verification_status default 'pending';

update public.seller_profiles
set onboarding_status = 'REGISTERED'
where onboarding_status is null;

update public.seller_profiles
set review_status = 'pending'
where review_status is null;

alter table if exists public.seller_profiles
  alter column onboarding_status set default 'REGISTERED',
  alter column onboarding_status set not null;

alter table if exists public.seller_profiles
  alter column review_status set default 'pending',
  alter column review_status set not null;

create index if not exists seller_profiles_onboarding_status_idx
  on public.seller_profiles(onboarding_status);

-- ── supplier_addresses ──────────────────────────────────────────────────────
create table if not exists public.supplier_addresses (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  address_type text not null default 'registered',
  country_id uuid references public.countries(id) on delete set null,
  state_id uuid references public.states(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  full_address text,
  pincode text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_maps_url text,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_addresses
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists address_type text default 'registered',
  add column if not exists country_id uuid references public.countries(id) on delete set null,
  add column if not exists state_id uuid references public.states(id) on delete set null,
  add column if not exists city_id uuid references public.cities(id) on delete set null,
  add column if not exists full_address text,
  add column if not exists pincode text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists google_maps_url text,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'supplier_addresses'
      and column_name = 'seller_profile_id'
  ) then
    execute 'create unique index if not exists supplier_addresses_seller_profile_unique_idx on public.supplier_addresses(seller_profile_id)';
  end if;
end $$;

-- ── supplier_capabilities ───────────────────────────────────────────────────
create table if not exists public.supplier_capabilities (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  process_name text not null,
  materials_supported text[] not null default '{}',
  monthly_capacity text,
  machine_count integer,
  tolerance_capability text,
  max_part_size text,
  min_part_size text,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_capabilities
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists process_name text,
  add column if not exists materials_supported text[] default '{}',
  add column if not exists monthly_capacity text,
  add column if not exists machine_count integer,
  add column if not exists tolerance_capability text,
  add column if not exists max_part_size text,
  add column if not exists min_part_size text,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists supplier_capabilities_seller_profile_id_idx
  on public.supplier_capabilities(seller_profile_id);
create index if not exists supplier_capabilities_process_name_idx
  on public.supplier_capabilities(process_name);

-- ── supplier_factory_details ────────────────────────────────────────────────
create table if not exists public.supplier_factory_details (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  factory_area_sqft numeric(12, 2),
  production_area_sqft numeric(12, 2),
  warehouse_area_sqft numeric(12, 2),
  number_of_machines integer,
  quality_certifications text[] not null default '{}',
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_profile_id)
);

alter table public.supplier_factory_details
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists factory_area_sqft numeric(12, 2),
  add column if not exists production_area_sqft numeric(12, 2),
  add column if not exists warehouse_area_sqft numeric(12, 2),
  add column if not exists number_of_machines integer,
  add column if not exists quality_certifications text[] default '{}',
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- ── supplier_documents ──────────────────────────────────────────────────────
create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  storage_path text,
  verification_status public.mh_verification_status not null default 'pending',
  document_status text not null default 'uploaded',
  review_notes text,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  is_mandatory boolean not null default false,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.supplier_documents
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists document_type text,
  add column if not exists file_url text,
  add column if not exists storage_path text,
  add column if not exists verification_status public.mh_verification_status default 'pending',
  add column if not exists document_status text default 'uploaded',
  add column if not exists review_notes text,
  add column if not exists reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists is_mandatory boolean default false,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists supplier_documents_seller_profile_id_idx
  on public.supplier_documents(seller_profile_id);
create index if not exists supplier_documents_document_type_idx
  on public.supplier_documents(document_type);
create index if not exists supplier_documents_verification_status_idx
  on public.supplier_documents(verification_status);

-- ── supplier_media ────────────────────────────────────────────────────────────
create table if not exists public.supplier_media (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  media_type text not null default 'image',
  category text not null,
  file_url text not null,
  storage_path text,
  thumbnail_url text,
  caption text,
  sort_order integer not null default 100,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.supplier_media
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists media_type text default 'image',
  add column if not exists category text,
  add column if not exists file_url text,
  add column if not exists storage_path text,
  add column if not exists thumbnail_url text,
  add column if not exists caption text,
  add column if not exists sort_order integer default 100,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists supplier_media_seller_profile_id_idx
  on public.supplier_media(seller_profile_id);
create index if not exists supplier_media_category_idx
  on public.supplier_media(category);

-- ── supplier_verifications ────────────────────────────────────────────────────
create table if not exists public.supplier_verifications (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null,
  target_value text not null,
  is_verified boolean not null default false,
  verified_at timestamptz,
  otp_hash text,
  otp_expires_at timestamptz,
  attempt_count integer not null default 0,
  status text not null default 'pending',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_profile_id, verification_type)
);

alter table public.supplier_verifications
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists verification_type text,
  add column if not exists target_value text,
  add column if not exists is_verified boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists otp_hash text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists attempt_count integer default 0,
  add column if not exists status text default 'pending',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists supplier_verifications_profile_id_idx
  on public.supplier_verifications(profile_id);

-- ── supplier_completion_tracking ──────────────────────────────────────────────
create table if not exists public.supplier_completion_tracking (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  section_key text not null,
  section_label text not null,
  weight integer not null default 0,
  percent_complete integer not null default 0 check (percent_complete between 0 and 100),
  missing_fields text[] not null default '{}',
  is_complete boolean not null default false,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_profile_id, section_key)
);

alter table public.supplier_completion_tracking
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists section_key text,
  add column if not exists section_label text,
  add column if not exists weight integer default 0,
  add column if not exists percent_complete integer default 0,
  add column if not exists missing_fields text[] default '{}',
  add column if not exists is_complete boolean default false,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists supplier_completion_tracking_seller_profile_id_idx
  on public.supplier_completion_tracking(seller_profile_id);

-- ── supplier_review_logs ──────────────────────────────────────────────────────
create table if not exists public.supplier_review_logs (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_status public.supplier_onboarding_status,
  new_status public.supplier_onboarding_status,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplier_review_logs
  add column if not exists seller_profile_id uuid references public.seller_profiles(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists action text,
  add column if not exists previous_status public.supplier_onboarding_status,
  add column if not exists new_status public.supplier_onboarding_status,
  add column if not exists notes text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists supplier_review_logs_seller_profile_id_idx
  on public.supplier_review_logs(seller_profile_id);
create index if not exists supplier_review_logs_created_at_idx
  on public.supplier_review_logs(created_at desc);

-- ── Extend supplier_trust_scores for verification pipeline ──────────────────
alter table if exists public.supplier_trust_scores
  add column if not exists profile_completion_score numeric(5, 2) default 0,
  add column if not exists documents_score numeric(5, 2) default 0,
  add column if not exists verification_score numeric(5, 2) default 0,
  add column if not exists factory_photos_score numeric(5, 2) default 0,
  add column if not exists certifications_score numeric(5, 2) default 0,
  add column if not exists response_rate_score numeric(5, 2) default 0,
  add column if not exists rfq_success_score numeric(5, 2) default 0,
  add column if not exists trust_score integer default 0,
  add column if not exists status text default 'active',
  add column if not exists review_status public.mh_verification_status default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ── Anti-abuse: duplicate phone detection ───────────────────────────────────
create unique index if not exists profiles_phone_unique_idx
  on public.profiles(phone)
  where phone is not null and deleted_at is null;

-- ── RLS policies (use unqualified seller_profile_id — refers to policy table row) ──
alter table if exists public.supplier_addresses enable row level security;
alter table if exists public.supplier_capabilities enable row level security;
alter table if exists public.supplier_factory_details enable row level security;
alter table if exists public.supplier_documents enable row level security;
alter table if exists public.supplier_media enable row level security;
alter table if exists public.supplier_verifications enable row level security;
alter table if exists public.supplier_completion_tracking enable row level security;
alter table if exists public.supplier_review_logs enable row level security;

drop policy if exists supplier_addresses_own_all on public.supplier_addresses;
create policy supplier_addresses_own_all on public.supplier_addresses
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_capabilities_own_all on public.supplier_capabilities;
create policy supplier_capabilities_own_all on public.supplier_capabilities
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_factory_details_own_all on public.supplier_factory_details;
create policy supplier_factory_details_own_all on public.supplier_factory_details
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_documents_own_all on public.supplier_documents;
create policy supplier_documents_own_all on public.supplier_documents
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_media_own_all on public.supplier_media;
create policy supplier_media_own_all on public.supplier_media
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_verifications_own_all on public.supplier_verifications;
create policy supplier_verifications_own_all on public.supplier_verifications
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_completion_tracking_own_all on public.supplier_completion_tracking;
create policy supplier_completion_tracking_own_all on public.supplier_completion_tracking
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.profile_id = auth.uid()));

drop policy if exists supplier_media_public_read on public.supplier_media;
create policy supplier_media_public_read on public.supplier_media
  for select to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.seller_profiles sp
      where sp.id = supplier_media.seller_profile_id
        and sp.onboarding_status = 'APPROVED'
    )
  );

drop policy if exists supplier_review_logs_admin_read on public.supplier_review_logs;
create policy supplier_review_logs_admin_read on public.supplier_review_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('admin', 'super_admin', 'superadmin', 'supplier_success', 'moderator')
    )
  );

-- Backfill onboarding status for existing sellers
update public.seller_profiles sp
set onboarding_status = case
  when sp.verification_status = 'approved' then 'APPROVED'::public.supplier_onboarding_status
  when sp.profile_completion_percent >= 100 then 'PROFILE_SUBMITTED'::public.supplier_onboarding_status
  when sp.profile_completion_percent > 0 then 'PROFILE_INCOMPLETE'::public.supplier_onboarding_status
  else 'REGISTERED'::public.supplier_onboarding_status
end
where sp.onboarding_status = 'REGISTERED';
