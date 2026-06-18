-- CustomTolerance Onboarding V3 Intelligence
-- Adds normalized buyer/seller onboarding intelligence tables for matching,
-- verification, risk review, CRM segmentation, and future AI supplier matching.

create extension if not exists pgcrypto;

-- Buyer procurement intelligence
create table if not exists public.buyer_preferences (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_type text,
  contact_designation text,
  business_email text,
  mobile_number text,
  company_website text,
  annual_procurement_budget text,
  order_frequency text,
  procurement_methods text[] not null default '{}',
  import_experience text,
  preferred_incoterms text[] not null default '{}',
  preferred_payment_terms text[] not null default '{}',
  procurement_team_size text,
  company_description text,
  logo_url text,
  social_links jsonb not null default '{}'::jsonb,
  agreements jsonb not null default '{}'::jsonb,
  email_verified boolean not null default false,
  mobile_verified boolean not null default false,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_profile_id)
);

create table if not exists public.buyer_industries (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
  industry_name text not null,
  created_at timestamptz not null default now(),
  unique (buyer_profile_id, industry_name)
);

create table if not exists public.buyer_category_interests (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
  category_name text not null,
  created_at timestamptz not null default now(),
  unique (buyer_profile_id, category_name)
);

create table if not exists public.buyer_import_countries (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
  country_name text not null,
  created_at timestamptz not null default now(),
  unique (buyer_profile_id, country_name)
);

-- Seller KYC and capability intelligence
create table if not exists public.seller_kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null,
  identifier text,
  provider text,
  verification_status public.mh_verification_status not null default 'pending',
  is_verified boolean not null default false,
  verified_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  review_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_profile_id, verification_type)
);

create table if not exists public.seller_bank_details (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text,
  account_holder_name text,
  account_number_last4 text,
  account_number_fingerprint text,
  ifsc_code text,
  branch_name text,
  cancelled_cheque_document_id uuid references public.supplier_documents(id) on delete set null,
  verification_status public.mh_verification_status not null default 'pending',
  verified_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_profile_id)
);

create table if not exists public.seller_capability_categories (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  category_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_profile_id, category_name)
);

create table if not exists public.seller_sub_capabilities (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  category_name text not null,
  sub_capability_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_profile_id, category_name, sub_capability_name)
);

create table if not exists public.seller_materials (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  material_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_profile_id, material_name)
);

create table if not exists public.seller_machines (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  machine_name text not null,
  brand text,
  model text,
  quantity integer not null default 1 check (quantity > 0),
  capacity text,
  year_purchased integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_certifications (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  certificate_name text not null,
  certificate_number text,
  expiry_date date,
  document_url text,
  storage_path text,
  verification_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_export_experience (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  customer_name text,
  country text not null,
  product_exported text,
  order_value text,
  proof_document_url text,
  storage_path text,
  review_status public.mh_verification_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_quality_systems (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles(id) on delete cascade,
  system_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_profile_id, system_name)
);

create table if not exists public.marketplace_risk_signals (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  resource_type text not null,
  resource_id uuid,
  signal_key text not null,
  severity text not null default 'medium',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists buyer_preferences_profile_idx on public.buyer_preferences(profile_id);
create index if not exists buyer_preferences_completion_idx on public.buyer_preferences(completion_percent desc);
create index if not exists buyer_industries_name_idx on public.buyer_industries(industry_name);
create index if not exists buyer_category_interests_name_idx on public.buyer_category_interests(category_name);

create index if not exists seller_kyc_seller_idx on public.seller_kyc_verifications(seller_profile_id);
create index if not exists seller_kyc_type_idx on public.seller_kyc_verifications(verification_type);
create index if not exists seller_kyc_status_idx on public.seller_kyc_verifications(verification_status);
create index if not exists seller_bank_seller_idx on public.seller_bank_details(seller_profile_id);
create index if not exists seller_capability_categories_name_idx on public.seller_capability_categories(category_name);
create index if not exists seller_sub_capabilities_name_idx on public.seller_sub_capabilities(sub_capability_name);
create index if not exists seller_materials_name_idx on public.seller_materials(material_name);
create index if not exists seller_machines_seller_idx on public.seller_machines(seller_profile_id);
create index if not exists seller_certifications_seller_idx on public.seller_certifications(seller_profile_id);
create index if not exists seller_export_experience_country_idx on public.seller_export_experience(country);
create index if not exists marketplace_risk_signals_status_idx on public.marketplace_risk_signals(status);
create index if not exists marketplace_risk_signals_resource_idx on public.marketplace_risk_signals(resource_type, resource_id);

-- updated_at triggers
drop trigger if exists buyer_preferences_set_updated_at on public.buyer_preferences;
create trigger buyer_preferences_set_updated_at
before update on public.buyer_preferences
for each row execute function public.set_updated_at();

drop trigger if exists seller_kyc_verifications_set_updated_at on public.seller_kyc_verifications;
create trigger seller_kyc_verifications_set_updated_at
before update on public.seller_kyc_verifications
for each row execute function public.set_updated_at();

drop trigger if exists seller_bank_details_set_updated_at on public.seller_bank_details;
create trigger seller_bank_details_set_updated_at
before update on public.seller_bank_details
for each row execute function public.set_updated_at();

drop trigger if exists seller_machines_set_updated_at on public.seller_machines;
create trigger seller_machines_set_updated_at
before update on public.seller_machines
for each row execute function public.set_updated_at();

drop trigger if exists seller_certifications_set_updated_at on public.seller_certifications;
create trigger seller_certifications_set_updated_at
before update on public.seller_certifications
for each row execute function public.set_updated_at();

drop trigger if exists seller_export_experience_set_updated_at on public.seller_export_experience;
create trigger seller_export_experience_set_updated_at
before update on public.seller_export_experience
for each row execute function public.set_updated_at();

drop trigger if exists marketplace_risk_signals_set_updated_at on public.marketplace_risk_signals;
create trigger marketplace_risk_signals_set_updated_at
before update on public.marketplace_risk_signals
for each row execute function public.set_updated_at();

-- RLS
alter table public.buyer_preferences enable row level security;
alter table public.buyer_industries enable row level security;
alter table public.buyer_category_interests enable row level security;
alter table public.buyer_import_countries enable row level security;
alter table public.seller_kyc_verifications enable row level security;
alter table public.seller_bank_details enable row level security;
alter table public.seller_capability_categories enable row level security;
alter table public.seller_sub_capabilities enable row level security;
alter table public.seller_materials enable row level security;
alter table public.seller_machines enable row level security;
alter table public.seller_certifications enable row level security;
alter table public.seller_export_experience enable row level security;
alter table public.seller_quality_systems enable row level security;
alter table public.marketplace_risk_signals enable row level security;

-- Buyer ownership policies
drop policy if exists buyer_preferences_own_all on public.buyer_preferences;
create policy buyer_preferences_own_all on public.buyer_preferences
  for all to authenticated
  using (profile_id = auth.uid() or public.is_admin_role())
  with check (profile_id = auth.uid() or public.is_admin_role());

drop policy if exists buyer_industries_own_all on public.buyer_industries;
create policy buyer_industries_own_all on public.buyer_industries
  for all to authenticated
  using (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists buyer_category_interests_own_all on public.buyer_category_interests;
create policy buyer_category_interests_own_all on public.buyer_category_interests
  for all to authenticated
  using (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists buyer_import_countries_own_all on public.buyer_import_countries;
create policy buyer_import_countries_own_all on public.buyer_import_countries
  for all to authenticated
  using (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.buyer_profiles bp where bp.id = buyer_profile_id and (bp.profile_id = auth.uid() or public.is_admin_role())));

-- Seller ownership policies
drop policy if exists seller_kyc_verifications_own_all on public.seller_kyc_verifications;
create policy seller_kyc_verifications_own_all on public.seller_kyc_verifications
  for all to authenticated
  using (profile_id = auth.uid() or public.is_admin_role())
  with check (profile_id = auth.uid() or public.is_admin_role());

drop policy if exists seller_bank_details_own_all on public.seller_bank_details;
create policy seller_bank_details_own_all on public.seller_bank_details
  for all to authenticated
  using (profile_id = auth.uid() or public.is_admin_role())
  with check (profile_id = auth.uid() or public.is_admin_role());

drop policy if exists seller_capability_categories_own_all on public.seller_capability_categories;
create policy seller_capability_categories_own_all on public.seller_capability_categories
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_sub_capabilities_own_all on public.seller_sub_capabilities;
create policy seller_sub_capabilities_own_all on public.seller_sub_capabilities
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_materials_own_all on public.seller_materials;
create policy seller_materials_own_all on public.seller_materials
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_machines_own_all on public.seller_machines;
create policy seller_machines_own_all on public.seller_machines
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_certifications_own_all on public.seller_certifications;
create policy seller_certifications_own_all on public.seller_certifications
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_export_experience_own_all on public.seller_export_experience;
create policy seller_export_experience_own_all on public.seller_export_experience
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists seller_quality_systems_own_all on public.seller_quality_systems;
create policy seller_quality_systems_own_all on public.seller_quality_systems
  for all to authenticated
  using (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())))
  with check (exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and (sp.profile_id = auth.uid() or public.is_admin_role())));

drop policy if exists marketplace_risk_signals_admin_read on public.marketplace_risk_signals;
create policy marketplace_risk_signals_admin_read on public.marketplace_risk_signals
  for select to authenticated
  using (public.is_admin_role() or actor_id = auth.uid());

drop policy if exists marketplace_risk_signals_authenticated_insert on public.marketplace_risk_signals;
create policy marketplace_risk_signals_authenticated_insert on public.marketplace_risk_signals
  for insert to authenticated
  with check (actor_id = auth.uid() or public.is_admin_role());

drop policy if exists marketplace_risk_signals_admin_update on public.marketplace_risk_signals;
create policy marketplace_risk_signals_admin_update on public.marketplace_risk_signals
  for update to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());
