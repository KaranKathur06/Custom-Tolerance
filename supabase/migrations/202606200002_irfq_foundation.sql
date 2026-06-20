-- CT-IRFQ™ Foundation (Phase P0)
-- Multi-item RFQs, reference datasets, file pipeline, draft/publish lifecycle

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.irfq_creation_method as enum (
    'manual', 'ai_quick', 'drawing_upload', 'bom_upload',
    'quotation_upload', 'catalog_import', 'repeat', 'conversational',
    'api_import', 'erp_integration'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irfq_privacy_level as enum (
    'public', 'private', 'invite_only', 'anonymous', 'nda_protected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irfq_risk_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irfq_subscription_plan as enum ('free', 'premium', 'enterprise');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.irfq_match_strength as enum ('weak', 'moderate', 'good', 'strong');
exception when duplicate_object then null;
end $$;

-- Extend lifecycle statuses (both enum variants may exist in the wild)
do $$ begin alter type public.rfq_status add value if not exists 'receiving_quotes'; exception when others then null; end $$;
do $$ begin alter type public.rfq_status add value if not exists 'negotiating'; exception when others then null; end $$;
do $$ begin alter type public.rfq_status add value if not exists 'expired'; exception when others then null; end $$;
do $$ begin alter type public.rfq_status add value if not exists 'pending_review'; exception when others then null; end $$;
do $$ begin alter type public.mh_rfq_status add value if not exists 'receiving_quotes'; exception when others then null; end $$;
do $$ begin alter type public.mh_rfq_status add value if not exists 'negotiating'; exception when others then null; end $$;
do $$ begin alter type public.mh_rfq_status add value if not exists 'expired'; exception when others then null; end $$;
do $$ begin alter type public.mh_rfq_status add value if not exists 'pending_review'; exception when others then null; end $$;

-- ── Reference data tables ────────────────────────────────────────────────────

create table if not exists public.ref_project_types (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_units (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_currencies (
  code char(3) primary key,
  name text not null,
  symbol text not null,
  priority integer not null default 100
);

create table if not exists public.ref_tolerances (
  slug text primary key,
  label text not null,
  value_mm numeric,
  sort_order integer not null default 100
);

create table if not exists public.ref_surface_finishes (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_materials (
  slug text primary key,
  name text not null,
  family text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_material_grades (
  slug text primary key,
  material_slug text references public.ref_materials(slug),
  grade text not null,
  standard text,
  sort_order integer not null default 100
);

create table if not exists public.ref_incoterms (
  slug text primary key,
  name text not null,
  description text,
  sort_order integer not null default 100
);

create table if not exists public.ref_payment_terms (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_payment_modes (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_shipping_modes (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_turnover_ranges (
  slug text primary key,
  label text not null,
  min_usd bigint,
  max_usd bigint,
  sort_order integer not null default 100
);

create table if not exists public.ref_employee_ranges (
  slug text primary key,
  label text not null,
  min_count integer,
  max_count integer,
  sort_order integer not null default 100
);

create table if not exists public.ref_factory_size_ranges (
  slug text primary key,
  label text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_production_capacity (
  slug text primary key,
  label text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_experience_years (
  slug text primary key,
  label text not null,
  min_years integer not null,
  sort_order integer not null default 100
);

-- ── Extend rfqs header ───────────────────────────────────────────────────────

alter table if exists public.rfqs
  add column if not exists project_name text,
  add column if not exists rfq_title text,
  add column if not exists project_type text,
  add column if not exists creation_method public.irfq_creation_method default 'manual',
  add column if not exists privacy_level public.irfq_privacy_level default 'public',
  add column if not exists risk_level public.irfq_risk_level,
  add column if not exists risk_score numeric(5,2),
  add column if not exists risk_factors jsonb default '[]'::jsonb,
  add column if not exists quotation_deadline timestamptz,
  add column if not exists manufacturing_lead_time_days integer,
  add column if not exists expected_delivery_date date,
  add column if not exists payment_terms text,
  add column if not exists payment_mode text,
  add column if not exists delivery_mode text,
  add column if not exists shipping_preferences text[] default '{}',
  add column if not exists currency_code char(3) default 'USD',
  add column if not exists target_price numeric(18,4),
  add column if not exists buyer_country char(2) default 'IN',
  add column if not exists buyer_state text,
  add column if not exists buyer_city text,
  add column if not exists delivery_postal_code text,
  add column if not exists supplier_location_pref jsonb default '{}'::jsonb,
  add column if not exists supplier_requirements jsonb default '{}'::jsonb,
  add column if not exists advanced_supplier_filters jsonb default '{}'::jsonb,
  add column if not exists ai_metadata jsonb default '{}'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists parent_rfq_id uuid references public.rfqs(id) on delete set null,
  add column if not exists subscription_plan_at_create public.irfq_subscription_plan default 'free',
  add column if not exists max_supplier_matches integer not null default 5,
  add column if not exists collaboration_enabled boolean not null default false,
  add column if not exists nda_required boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists composer_step integer not null default 0,
  add column if not exists composer_data jsonb default '{}'::jsonb;

create index if not exists rfqs_status_draft_idx on public.rfqs (buyer_user_id, status) where status::text = 'draft';
create index if not exists rfqs_creation_method_idx on public.rfqs (creation_method);

-- ── RFQ line items ───────────────────────────────────────────────────────────

create table if not exists public.rfq_items (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  line_number integer not null,
  item_name text not null,
  part_number text,
  part_revision text,
  drawing_number text,
  description text,
  quantity numeric(18,4) not null check (quantity > 0),
  unit text not null,
  annual_requirement numeric(18,4),
  moq numeric(18,4),
  target_price numeric(18,4),
  currency_code char(3),
  tolerance text,
  tolerance_custom text,
  surface_finish text[] default '{}',
  surface_finish_custom text,
  heat_treatment text,
  sort_order integer not null default 0,
  ai_extracted boolean not null default false,
  ai_confidence jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, line_number)
);

create index if not exists rfq_items_rfq_idx on public.rfq_items (rfq_id, line_number);

drop trigger if exists rfq_items_set_updated_at on public.rfq_items;
create trigger rfq_items_set_updated_at
before update on public.rfq_items
for each row execute function public.set_updated_at();

create table if not exists public.rfq_item_materials (
  id uuid primary key default gen_random_uuid(),
  rfq_item_id uuid not null references public.rfq_items(id) on delete cascade,
  material_slug text references public.ref_materials(slug),
  material_name text not null,
  material_grade text,
  is_custom_grade boolean not null default false
);

create index if not exists rfq_item_materials_item_idx on public.rfq_item_materials (rfq_item_id);

create table if not exists public.rfq_item_capabilities (
  rfq_item_id uuid not null references public.rfq_items(id) on delete cascade,
  capability_id uuid not null references public.capabilities(id) on delete cascade,
  primary key (rfq_item_id, capability_id)
);

-- ── Supplier requirements ────────────────────────────────────────────────────

create table if not exists public.rfq_supplier_requirements (
  rfq_id uuid primary key references public.rfqs(id) on delete cascade,
  verified_supplier boolean not null default false,
  iso_certified boolean not null default false,
  export_experience boolean not null default false,
  trade_assurance boolean not null default false,
  nda_ready boolean not null default false,
  oem_experience boolean not null default false,
  rohs_compliance boolean not null default false,
  reach_compliance boolean not null default false,
  conflict_free_materials boolean not null default false,
  environmental_compliance boolean not null default false,
  financially_stable boolean not null default false,
  annual_turnover_range text,
  employee_strength_range text,
  factory_size_range text,
  production_capacity_range text,
  min_years_experience integer,
  required_certification_ids uuid[] default '{}'
);

-- ── Extend rfq_files ─────────────────────────────────────────────────────────

alter table if exists public.rfq_files
  add column if not exists rfq_item_id uuid references public.rfq_items(id) on delete set null,
  add column if not exists mime_type text,
  add column if not exists checksum_sha256 text,
  add column if not exists virus_scan_status text not null default 'pending',
  add column if not exists virus_scan_at timestamptz,
  add column if not exists is_nda_gated boolean not null default false,
  add column if not exists ai_processing_status text not null default 'pending',
  add column if not exists ai_extraction jsonb default '{}'::jsonb,
  add column if not exists ai_confidence jsonb default '{}'::jsonb,
  add column if not exists file_version integer not null default 1;

create table if not exists public.rfq_file_ai_extractions (
  id uuid primary key default gen_random_uuid(),
  rfq_file_id uuid not null references public.rfq_files(id) on delete cascade,
  field_name text not null,
  extracted_value text,
  confidence numeric(5,2),
  confirmed_by_buyer boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  raw_model_output jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rfq_file_ai_extractions_file_idx on public.rfq_file_ai_extractions (rfq_file_id);

-- ── Matching (foundation) ────────────────────────────────────────────────────

create table if not exists public.rfq_supplier_matches (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  match_score numeric(5,2) not null check (match_score between 0 and 100),
  match_strength public.irfq_match_strength,
  score_breakdown jsonb not null default '{}'::jsonb,
  explanation text[] default '{}',
  rank integer,
  notified_at timestamptz,
  viewed_at timestamptz,
  quote_submitted boolean not null default false,
  is_invited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);

create index if not exists rfq_supplier_matches_rfq_score_idx
  on public.rfq_supplier_matches (rfq_id, match_score desc);

-- ── Subscription usage ───────────────────────────────────────────────────────

create table if not exists public.irfq_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug public.irfq_subscription_plan not null unique,
  name text not null,
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  price_monthly_inr numeric(12,2),
  price_monthly_usd numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.irfq_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  rfqs_created integer not null default 0,
  ai_assistant_uses integer not null default 0,
  bom_parses integer not null default 0,
  api_imports integer not null default 0,
  primary key (user_id, period_start)
);

-- ── Activity log ─────────────────────────────────────────────────────────────

create table if not exists public.rfq_activity_log (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rfq_activity_log_rfq_idx on public.rfq_activity_log (rfq_id, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.rfq_items enable row level security;
alter table public.rfq_item_materials enable row level security;
alter table public.rfq_item_capabilities enable row level security;
alter table public.rfq_supplier_requirements enable row level security;
alter table public.rfq_file_ai_extractions enable row level security;
alter table public.rfq_supplier_matches enable row level security;
alter table public.rfq_activity_log enable row level security;
alter table public.irfq_usage_counters enable row level security;

-- Reference tables: public read
alter table public.ref_project_types enable row level security;
alter table public.ref_units enable row level security;
alter table public.ref_currencies enable row level security;
alter table public.ref_tolerances enable row level security;
alter table public.ref_surface_finishes enable row level security;
alter table public.ref_materials enable row level security;
alter table public.ref_material_grades enable row level security;
alter table public.ref_incoterms enable row level security;
alter table public.ref_payment_terms enable row level security;
alter table public.ref_payment_modes enable row level security;
alter table public.ref_shipping_modes enable row level security;
alter table public.ref_turnover_ranges enable row level security;
alter table public.ref_employee_ranges enable row level security;
alter table public.ref_factory_size_ranges enable row level security;
alter table public.ref_production_capacity enable row level security;
alter table public.ref_experience_years enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ref_project_types','ref_units','ref_currencies','ref_tolerances',
    'ref_surface_finishes','ref_materials','ref_material_grades','ref_incoterms',
    'ref_payment_terms','ref_payment_modes','ref_shipping_modes','ref_turnover_ranges',
    'ref_employee_ranges','ref_factory_size_ranges','ref_production_capacity','ref_experience_years'
  ] loop
    execute format('drop policy if exists %I_public_read on public.%I', t, t);
    execute format(
      'create policy %I_public_read on public.%I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

create or replace function public.irfq_user_owns_rfq(target_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rfqs r
    where r.id = target_rfq_id
      and (
        r.buyer_user_id = auth.uid()
        or exists (
          select 1 from public.buyer_profiles bp
          where bp.id = r.buyer_profile_id and bp.profile_id = auth.uid()
        )
        or public.is_admin_role()
      )
  );
$$;

drop policy if exists rfq_items_owner on public.rfq_items;
create policy rfq_items_owner on public.rfq_items
  for all to authenticated
  using (public.irfq_user_owns_rfq(rfq_id))
  with check (public.irfq_user_owns_rfq(rfq_id));

drop policy if exists rfq_items_read_open on public.rfq_items;
create policy rfq_items_read_open on public.rfq_items
  for select to authenticated
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id and r.status::text in ('open', 'in_review', 'receiving_quotes', 'awarded', 'quoted')
    )
  );

drop policy if exists rfq_item_materials_owner on public.rfq_item_materials;
create policy rfq_item_materials_owner on public.rfq_item_materials
  for all to authenticated
  using (
    exists (
      select 1 from public.rfq_items i
      where i.id = rfq_item_id and public.irfq_user_owns_rfq(i.rfq_id)
    )
  )
  with check (
    exists (
      select 1 from public.rfq_items i
      where i.id = rfq_item_id and public.irfq_user_owns_rfq(i.rfq_id)
    )
  );

drop policy if exists rfq_supplier_requirements_owner on public.rfq_supplier_requirements;
create policy rfq_supplier_requirements_owner on public.rfq_supplier_requirements
  for all to authenticated
  using (public.irfq_user_owns_rfq(rfq_id))
  with check (public.irfq_user_owns_rfq(rfq_id));

drop policy if exists rfq_supplier_matches_buyer on public.rfq_supplier_matches;
create policy rfq_supplier_matches_buyer on public.rfq_supplier_matches
  for select to authenticated
  using (public.irfq_user_owns_rfq(rfq_id) or public.is_admin_role());

drop policy if exists rfq_activity_log_read on public.rfq_activity_log;
create policy rfq_activity_log_read on public.rfq_activity_log
  for select to authenticated
  using (public.irfq_user_owns_rfq(rfq_id) or public.is_admin_role());

drop policy if exists rfq_activity_log_insert on public.rfq_activity_log;
create policy rfq_activity_log_insert on public.rfq_activity_log
  for insert to authenticated
  with check (public.irfq_user_owns_rfq(rfq_id) or public.is_admin_role());

drop policy if exists irfq_usage_counters_own on public.irfq_usage_counters;
create policy irfq_usage_counters_own on public.irfq_usage_counters
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Storage: rfq-drawings (private) ──────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('rfq-drawings', 'rfq-drawings', false, 524288000)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists rfq_drawings_owner_all on storage.objects;
create policy rfq_drawings_owner_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'rfq-drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'rfq-drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists rfq_drawings_admin_read on storage.objects;
create policy rfq_drawings_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rfq-drawings'
    and public.is_admin_role()
  );

-- ── Seed reference data ────────────────────────────────────────────────────────

insert into public.ref_project_types (slug, name, sort_order) values
  ('prototype', 'Prototype', 10),
  ('trial_order', 'Trial Order', 20),
  ('small_batch', 'Small Batch', 30),
  ('production_batch', 'Production Batch', 40),
  ('annual_contract', 'Annual Contract', 50),
  ('oem_manufacturing', 'OEM Manufacturing', 60),
  ('odm_manufacturing', 'ODM Manufacturing', 70),
  ('tooling_development', 'Tooling Development', 80),
  ('rd_project', 'R&D Project', 90),
  ('spare_parts', 'Spare Parts Procurement', 100)
on conflict (slug) do nothing;

insert into public.ref_units (slug, name, sort_order) values
  ('pieces', 'Pieces', 10),
  ('kilograms', 'Kilograms', 20),
  ('tons', 'Tons', 30),
  ('sets', 'Sets', 40),
  ('meters', 'Meters', 50),
  ('feet', 'Feet', 60),
  ('liters', 'Liters', 70),
  ('boxes', 'Boxes', 80),
  ('rolls', 'Rolls', 90)
on conflict (slug) do nothing;

insert into public.ref_currencies (code, name, symbol, priority) values
  ('USD', 'US Dollar', '$', 1),
  ('EUR', 'Euro', '€', 2),
  ('INR', 'Indian Rupee', '₹', 3),
  ('AED', 'UAE Dirham', 'د.إ', 4),
  ('GBP', 'British Pound', '£', 5),
  ('AUD', 'Australian Dollar', 'A$', 6),
  ('CAD', 'Canadian Dollar', 'C$', 7),
  ('SGD', 'Singapore Dollar', 'S$', 8),
  ('JPY', 'Japanese Yen', '¥', 9),
  ('CNY', 'Chinese Yuan', '¥', 10),
  ('SAR', 'Saudi Riyal', '﷼', 11),
  ('QAR', 'Qatari Riyal', '﷼', 12),
  ('KWD', 'Kuwaiti Dinar', 'د.ك', 13),
  ('OMR', 'Omani Rial', '﷼', 14)
on conflict (code) do nothing;

insert into public.ref_tolerances (slug, label, value_mm, sort_order) values
  ('pm5mm', '±5 mm', 5, 10),
  ('pm1mm', '±1 mm', 1, 20),
  ('pm0_5mm', '±0.5 mm', 0.5, 30),
  ('pm0_1mm', '±0.1 mm', 0.1, 40),
  ('pm0_05mm', '±0.05 mm', 0.05, 50),
  ('pm0_01mm', '±0.01 mm', 0.01, 60),
  ('custom', 'Custom', null, 70)
on conflict (slug) do nothing;

insert into public.ref_surface_finishes (slug, name, sort_order) values
  ('polishing', 'Polishing', 10),
  ('grinding', 'Grinding', 20),
  ('sand_blasting', 'Sand Blasting', 30),
  ('powder_coating', 'Powder Coating', 40),
  ('electroplating', 'Electroplating', 50),
  ('electropolishing', 'Electropolishing', 60),
  ('anodizing', 'Anodizing', 70),
  ('painting', 'Painting', 80),
  ('passivation', 'Passivation', 90),
  ('phosphate_coating', 'Phosphate Coating', 100),
  ('heat_treatment', 'Heat Treatment', 110),
  ('shot_peening', 'Shot Peening', 120),
  ('black_oxide', 'Black Oxide', 130),
  ('custom', 'Custom', 140)
on conflict (slug) do nothing;

insert into public.ref_materials (slug, name, family, sort_order) values
  ('steel', 'Steel', 'Metals', 10),
  ('carbon_steel', 'Carbon Steel', 'Metals', 20),
  ('alloy_steel', 'Alloy Steel', 'Metals', 30),
  ('stainless_steel', 'Stainless Steel', 'Metals', 40),
  ('tool_steel', 'Tool Steel', 'Metals', 50),
  ('aluminium', 'Aluminium', 'Metals', 60),
  ('copper', 'Copper', 'Metals', 70),
  ('brass', 'Brass', 'Metals', 80),
  ('bronze', 'Bronze', 'Metals', 90),
  ('titanium', 'Titanium', 'Metals', 100),
  ('nickel_alloy', 'Nickel Alloy', 'Metals', 110),
  ('inconel', 'Inconel', 'Metals', 120),
  ('monel', 'Monel', 'Metals', 130),
  ('magnesium', 'Magnesium', 'Metals', 140),
  ('zinc', 'Zinc', 'Metals', 150),
  ('lead', 'Lead', 'Metals', 160),
  ('cobalt', 'Cobalt', 'Metals', 170),
  ('plastic', 'Plastic', 'Plastics', 180)
on conflict (slug) do nothing;

insert into public.ref_material_grades (slug, material_slug, grade, standard, sort_order) values
  ('ss304', 'stainless_steel', 'SS304', 'AISI', 10),
  ('ss316', 'stainless_steel', 'SS316', 'AISI', 20),
  ('ss316l', 'stainless_steel', 'SS316L', 'AISI', 30),
  ('en8', 'carbon_steel', 'EN8', 'BS', 40),
  ('en19', 'carbon_steel', 'EN19', 'BS', 50),
  ('en24', 'carbon_steel', 'EN24', 'BS', 60),
  ('is2062', 'steel', 'IS2062', 'IS', 70),
  ('aisi_1018', 'carbon_steel', 'AISI 1018', 'AISI', 80),
  ('6061', 'aluminium', '6061', 'AA', 90),
  ('7075', 'aluminium', '7075', 'AA', 100),
  ('ti6al4v', 'titanium', 'Ti6Al4V', 'AMS', 110)
on conflict (slug) do nothing;

insert into public.ref_incoterms (slug, name, description, sort_order) values
  ('exw', 'EXW', 'Ex Works', 10),
  ('fob', 'FOB', 'Free On Board', 20),
  ('cif', 'CIF', 'Cost Insurance Freight', 30),
  ('cfr', 'CFR', 'Cost and Freight', 40),
  ('ddp', 'DDP', 'Delivered Duty Paid', 50),
  ('fca', 'FCA', 'Free Carrier', 60),
  ('cpt', 'CPT', 'Carriage Paid To', 70),
  ('cip', 'CIP', 'Carriage and Insurance Paid', 80)
on conflict (slug) do nothing;

insert into public.ref_payment_terms (slug, name, sort_order) values
  ('advance', 'Advance', 10),
  ('fifty_fifty', '50-50', 20),
  ('net_30', '30 Days', 30),
  ('net_45', '45 Days', 40),
  ('net_60', '60 Days', 50),
  ('net_90', '90 Days', 60),
  ('letter_of_credit', 'Letter of Credit', 70),
  ('escrow', 'Escrow', 80),
  ('negotiable', 'Negotiable', 90)
on conflict (slug) do nothing;

insert into public.ref_payment_modes (slug, name, sort_order) values
  ('bank_transfer', 'Bank Transfer', 10),
  ('credit_card', 'Credit Card', 20),
  ('letter_of_credit', 'Letter of Credit', 30),
  ('escrow', 'Escrow', 40),
  ('razorpay', 'Razorpay', 50),
  ('stripe', 'Stripe', 60),
  ('wire_transfer', 'Wire Transfer', 70)
on conflict (slug) do nothing;

insert into public.ref_shipping_modes (slug, name, sort_order) values
  ('air', 'Air', 10),
  ('sea', 'Sea', 20),
  ('rail', 'Rail', 30),
  ('road', 'Road', 40),
  ('courier', 'Courier', 50),
  ('flexible', 'Flexible', 60)
on conflict (slug) do nothing;

insert into public.ref_turnover_ranges (slug, label, min_usd, max_usd, sort_order) values
  ('under_100k', 'Under $100K', 0, 100000, 10),
  ('100k_500k', '$100K - $500K', 100000, 500000, 20),
  ('500k_1m', '$500K - $1M', 500000, 1000000, 30),
  ('1m_5m', '$1M - $5M', 1000000, 5000000, 40),
  ('5m_10m', '$5M - $10M', 5000000, 10000000, 50),
  ('10m_50m', '$10M - $50M', 10000000, 50000000, 60),
  ('50m_plus', '$50M+', 50000000, null, 70)
on conflict (slug) do nothing;

insert into public.ref_employee_ranges (slug, label, min_count, max_count, sort_order) values
  ('1_10', '1-10', 1, 10, 10),
  ('11_50', '11-50', 11, 50, 20),
  ('51_200', '51-200', 51, 200, 30),
  ('201_500', '201-500', 201, 500, 40),
  ('501_1000', '501-1000', 501, 1000, 50),
  ('1000_plus', '1000+', 1000, null, 60)
on conflict (slug) do nothing;

insert into public.ref_factory_size_ranges (slug, label, sort_order) values
  ('under_500', 'Under 500 sqm', 10),
  ('500_2000', '500-2000 sqm', 20),
  ('2000_5000', '2000-5000 sqm', 30),
  ('5000_10000', '5000-10000 sqm', 40),
  ('10000_plus', '10000 sqm+', 50)
on conflict (slug) do nothing;

insert into public.ref_production_capacity (slug, label, sort_order) values
  ('prototype_only', 'Prototype Only', 10),
  ('small_batch', 'Small Batch', 20),
  ('medium_batch', 'Medium Batch', 30),
  ('mass_production', 'Mass Production', 40),
  ('enterprise_scale', 'Enterprise Scale', 50)
on conflict (slug) do nothing;

insert into public.ref_experience_years (slug, label, min_years, sort_order) values
  ('1_plus', '1+', 1, 10),
  ('3_plus', '3+', 3, 20),
  ('5_plus', '5+', 5, 30),
  ('10_plus', '10+', 10, 40),
  ('20_plus', '20+', 20, 50)
on conflict (slug) do nothing;

insert into public.irfq_subscription_plans (slug, name, limits, features) values
  ('free', 'Free', '{"rfqs_per_month":3,"max_supplier_matches":5}'::jsonb, '{"advanced_filters":false,"ai_assistant":false}'::jsonb),
  ('premium', 'Premium', '{"rfqs_per_month":null,"max_supplier_matches":null}'::jsonb, '{"advanced_filters":true,"ai_assistant":true}'::jsonb),
  ('enterprise', 'Enterprise', '{"rfqs_per_month":null,"max_supplier_matches":null}'::jsonb, '{"advanced_filters":true,"ai_assistant":true,"api_import":true,"erp":true}'::jsonb)
on conflict (slug) do nothing;

-- ── Buyer-side supplier matching RPC (foundation) ──────────────────────────────

create or replace function public.match_suppliers_to_rfq(
  target_rfq_id uuid,
  max_results integer default 20,
  min_score numeric default 40
)
returns table (
  supplier_id uuid,
  company_name text,
  slug text,
  city text,
  state text,
  match_score numeric,
  match_strength public.irfq_match_strength,
  score_breakdown jsonb,
  explanation text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rfq_rec record;
  match_limit integer;
begin
  select r.* into rfq_rec from public.rfqs r where r.id = target_rfq_id;
  if rfq_rec is null then return; end if;

  match_limit := coalesce(rfq_rec.max_supplier_matches, 5);
  if match_limit > max_results then match_limit := max_results; end if;

  return query
  with rfq_caps as (
    select capability_id from public.rfq_capabilities where rfq_id = target_rfq_id
    union
    select ric.capability_id from public.rfq_item_capabilities ric
    join public.rfq_items ri on ri.id = ric.rfq_item_id
    where ri.rfq_id = target_rfq_id
  ),
  rfq_inds as (
    select industry_id from public.rfq_industries where rfq_id = target_rfq_id
  ),
  scored as (
    select
      s.id as supplier_id,
      s.company_name,
      s.slug,
      s.city,
      s.state,
      (
        coalesce((
          select count(*)::numeric * 18
          from public.supplier_capabilities sc
          where sc.supplier_id = s.id and sc.capability_id in (select capability_id from rfq_caps)
        ), 0)
        + coalesce((
          select count(*)::numeric * 12
          from public.supplier_industries si
          where si.supplier_id = s.id and si.industry_id in (select industry_id from rfq_inds)
        ), 0)
        + case when rfq_rec.state is not null and s.state = rfq_rec.state then 15 else 0 end
        + case when rfq_rec.city is not null and s.city = rfq_rec.city then 8 else 0 end
        + least(coalesce(s.review_avg, 0) * 3, 15)
        + case when s.export_capability then 5 else 0 end
        + least(coalesce(s.response_rate, 0) * 0.1, 10)
      )::numeric(5,2) as calc_score,
      jsonb_build_object(
        'capability', coalesce((select count(*) from public.supplier_capabilities sc where sc.supplier_id = s.id and sc.capability_id in (select capability_id from rfq_caps)), 0),
        'industry', coalesce((select count(*) from public.supplier_industries si where si.supplier_id = s.id and si.industry_id in (select industry_id from rfq_inds)), 0),
        'location_state', case when rfq_rec.state = s.state then 15 else 0 end,
        'location_city', case when rfq_rec.city = s.city then 8 else 0 end
      ) as breakdown
    from public.suppliers s
    where s.is_published = true
  )
  select
    scored.supplier_id,
    scored.company_name,
    scored.slug,
    scored.city,
    scored.state,
    least(scored.calc_score, 100) as match_score,
    case
      when scored.calc_score >= 90 then 'strong'::public.irfq_match_strength
      when scored.calc_score >= 75 then 'good'::public.irfq_match_strength
      when scored.calc_score >= 60 then 'moderate'::public.irfq_match_strength
      else 'weak'::public.irfq_match_strength
    end as match_strength,
    scored.breakdown as score_breakdown,
    array_remove(array[
      case when (scored.breakdown->>'capability')::int > 0 then 'Manufacturing capability match' end,
      case when (scored.breakdown->>'industry')::int > 0 then 'Industry experience match' end,
      case when (scored.breakdown->>'location_state')::int > 0 then 'Same state delivery preference' end,
      case when (scored.breakdown->>'location_city')::int > 0 then 'Same city delivery preference' end
    ], null) as explanation
  from scored
  where scored.calc_score >= min_score
  order by scored.calc_score desc
  limit match_limit;
end;
$$;
