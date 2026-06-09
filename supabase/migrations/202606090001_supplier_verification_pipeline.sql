-- CustomTolerance Supplier Verification Pipeline
-- Enterprise onboarding, verification, trust scoring, and anti-abuse foundation.

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
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists number_of_employees text,
  add column if not exists year_established integer;

create unique index if not exists companies_gst_number_unique_idx
  on public.companies(gst_number)
  where gst_number is not null and deleted_at is null;

-- ── Extend seller_profiles ──────────────────────────────────────────────────
alter table if exists public.seller_profiles
  add column if not exists onboarding_status public.supplier_onboarding_status not null default 'REGISTERED',
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists change_request_notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists review_status public.mh_verification_status not null default 'pending';

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

create unique index if not exists supplier_addresses_seller_profile_unique_idx
  on public.supplier_addresses(seller_profile_id);

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

create index if not exists supplier_capabilities_seller_profile_id_idx
  on public.supplier_capabilities(seller_profile_id);
create index if not exists supplier_capabilities_process_name_idx
  on public.supplier_capabilities(process_name);

-- ── supplier_factory_details ──────────────────────────────────────────────────
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

create index if not exists supplier_review_logs_seller_profile_id_idx
  on public.supplier_review_logs(seller_profile_id);
create index if not exists supplier_review_logs_created_at_idx
  on public.supplier_review_logs(created_at desc);

-- ── Extend supplier_trust_scores for verification pipeline ──────────────────
alter table if exists public.supplier_trust_scores
  add column if not exists profile_completion_score numeric(5, 2) not null default 0,
  add column if not exists documents_score numeric(5, 2) not null default 0,
  add column if not exists verification_score numeric(5, 2) not null default 0,
  add column if not exists factory_photos_score numeric(5, 2) not null default 0,
  add column if not exists certifications_score numeric(5, 2) not null default 0,
  add column if not exists response_rate_score numeric(5, 2) not null default 0,
  add column if not exists rfq_success_score numeric(5, 2) not null default 0,
  add column if not exists trust_score integer not null default 0 check (trust_score between 0 and 100),
  add column if not exists status text not null default 'active',
  add column if not exists review_status public.mh_verification_status not null default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ── Anti-abuse: duplicate phone detection ───────────────────────────────────
create unique index if not exists profiles_phone_unique_idx
  on public.profiles(phone)
  where phone is not null and deleted_at is null;

-- ── RLS policies ──────────────────────────────────────────────────────────────
alter table public.supplier_addresses enable row level security;
alter table public.supplier_capabilities enable row level security;
alter table public.supplier_factory_details enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.supplier_media enable row level security;
alter table public.supplier_verifications enable row level security;
alter table public.supplier_completion_tracking enable row level security;
alter table public.supplier_review_logs enable row level security;

-- Supplier owns their data
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'supplier_addresses',
    'supplier_capabilities',
    'supplier_factory_details',
    'supplier_documents',
    'supplier_media',
    'supplier_verifications',
    'supplier_completion_tracking'
  ]
  loop
    execute format('drop policy if exists %I_own_all on public.%I', tbl, tbl);
    execute format(
      'create policy %I_own_all on public.%I for all to authenticated using (
        exists (
          select 1 from public.seller_profiles sp
          where sp.id = %I.seller_profile_id and sp.profile_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.seller_profiles sp
          where sp.id = %I.seller_profile_id and sp.profile_id = auth.uid()
        )
      )',
      tbl, tbl, tbl, tbl
    );
  end loop;
end $$;

-- Public read for approved supplier media (factory photos on profile)
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

-- Admin/ops read review logs
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
