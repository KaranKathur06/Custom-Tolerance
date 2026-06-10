-- MetalHub Procurement Ecosystem Migration
-- Adds: saved_suppliers, rfq_files, quote_comparisons, notification_preferences,
-- gst_verifications, reviews, review_responses, whatsapp_events, platform_events,
-- guest_rfq_tokens. Extends: suppliers, rfqs, quotes.
-- Prerequisites: 20260519_marketplace_foundation.sql, 202606090001_supplier_verification_pipeline.sql

-- ── Enums ────────────────────────────────────────────────────────────────────

do $$
begin
  create type public.rfq_frequency as enum ('one_time', 'monthly', 'quarterly', 'annual');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.review_dimension as enum ('quality', 'delivery', 'communication', 'pricing');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.gst_status as enum ('active', 'inactive', 'cancelled', 'suspended', 'unknown');
exception when duplicate_object then null;
end $$;

-- ── Extend suppliers table ───────────────────────────────────────────────────

alter table if exists public.suppliers
  add column if not exists gstin text,
  add column if not exists gst_verified_at timestamptz,
  add column if not exists gst_legal_name text,
  add column if not exists gst_status public.gst_status,
  add column if not exists gst_state text,
  add column if not exists gst_registration_date date,
  add column if not exists founding_year integer,
  add column if not exists cover_image_url text,
  add column if not exists payment_terms text,
  add column if not exists lead_time_range text,
  add column if not exists member_since timestamptz,
  add column if not exists review_count integer not null default 0,
  add column if not exists review_avg numeric(3,2) not null default 0,
  add column if not exists verified_order_count integer not null default 0,
  add column if not exists avg_quote_time text,
  add column if not exists seller_profile_id uuid,
  add column if not exists company_id uuid;

-- Safe index on gstin (only non-null, published)
create unique index if not exists suppliers_gstin_unique_idx
  on public.suppliers(gstin)
  where gstin is not null and is_published = true;

-- Backfill member_since from created_at
update public.suppliers set member_since = created_at where member_since is null;
update public.suppliers set founding_year = established_year where founding_year is null and established_year is not null;

-- ── Extend rfqs table ────────────────────────────────────────────────────────

alter table if exists public.rfqs
  add column if not exists material_grade text,
  add column if not exists manufacturing_process text,
  add column if not exists frequency public.rfq_frequency default 'one_time',
  add column if not exists moq_required boolean default false,
  add column if not exists delivery_date date,
  add column if not exists delivery_state text,
  add column if not exists delivery_city text,
  add column if not exists delivery_timeline text,
  add column if not exists guest_token text,
  add column if not exists visibility_level text default 'standard',
  add column if not exists buyer_profile_id uuid,
  add column if not exists company_id uuid,
  add column if not exists taxonomy_id uuid;

create index if not exists rfqs_guest_token_idx on public.rfqs(guest_token) where guest_token is not null;
create index if not exists rfqs_buyer_profile_id_idx on public.rfqs(buyer_profile_id);
create index if not exists rfqs_delivery_state_idx on public.rfqs(delivery_state);

-- ── Extend quotes table ──────────────────────────────────────────────────────

alter table if exists public.quotes
  add column if not exists validity_days integer default 30,
  add column if not exists payment_terms text,
  add column if not exists attachments jsonb default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists viewed_at timestamptz,
  add column if not exists shortlisted_at timestamptz;

-- ── saved_suppliers ──────────────────────────────────────────────────────────

create table if not exists public.saved_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, supplier_id)
);

create index if not exists saved_suppliers_user_idx on public.saved_suppliers(user_id);
create index if not exists saved_suppliers_supplier_idx on public.saved_suppliers(supplier_id);

alter table public.saved_suppliers enable row level security;

drop policy if exists saved_suppliers_own on public.saved_suppliers;
create policy saved_suppliers_own on public.saved_suppliers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── rfq_files ────────────────────────────────────────────────────────────────

create table if not exists public.rfq_files (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text,
  file_type text not null, -- pdf, dxf, dwg, step, iges, image
  file_size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rfq_files_rfq_idx on public.rfq_files(rfq_id);

alter table public.rfq_files enable row level security;

drop policy if exists rfq_files_read on public.rfq_files;
create policy rfq_files_read on public.rfq_files
  for select to authenticated
  using (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id
        and (r.buyer_user_id = auth.uid() or r.status in ('open', 'in_review', 'awarded') or public.is_admin_role())
    )
  );

drop policy if exists rfq_files_insert on public.rfq_files;
create policy rfq_files_insert on public.rfq_files
  for insert to authenticated
  with check (
    exists (
      select 1 from public.rfqs r
      where r.id = rfq_id and r.buyer_user_id = auth.uid()
    )
    or public.is_admin_role()
  );

-- ── quote_comparisons ────────────────────────────────────────────────────────

create table if not exists public.quote_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  name text not null default 'Comparison',
  quote_ids uuid[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_comparisons_user_idx on public.quote_comparisons(user_id);
create index if not exists quote_comparisons_rfq_idx on public.quote_comparisons(rfq_id);

alter table public.quote_comparisons enable row level security;

drop policy if exists quote_comparisons_own on public.quote_comparisons;
create policy quote_comparisons_own on public.quote_comparisons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── notification_preferences ─────────────────────────────────────────────────

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  whatsapp_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  whatsapp_number text,
  -- Per-event toggles (jsonb for flexibility)
  event_preferences jsonb not null default '{
    "rfq_matched": {"whatsapp": true, "email": true},
    "new_inquiry": {"whatsapp": true, "email": true},
    "new_quote": {"whatsapp": true, "email": true},
    "quote_expiring": {"whatsapp": true, "email": true},
    "new_message": {"whatsapp": true, "email": false},
    "subscription_renewal": {"whatsapp": true, "email": true},
    "verification_approved": {"whatsapp": true, "email": true}
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── gst_verifications ────────────────────────────────────────────────────────

create table if not exists public.gst_verifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  gstin text not null,
  legal_name text,
  trade_name text,
  gst_state text,
  gst_state_code text,
  registration_date date,
  status public.gst_status not null default 'unknown',
  constitution_of_business text,
  taxpayer_type text,
  api_response jsonb, -- raw API response for audit
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null,
  is_current boolean not null default true,
  next_revalidation_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gst_verifications_supplier_idx on public.gst_verifications(supplier_id);
create index if not exists gst_verifications_gstin_idx on public.gst_verifications(gstin);
create index if not exists gst_verifications_current_idx on public.gst_verifications(is_current) where is_current = true;
create index if not exists gst_verifications_revalidation_idx on public.gst_verifications(next_revalidation_at) where is_current = true;

alter table public.gst_verifications enable row level security;

drop policy if exists gst_verifications_public_read on public.gst_verifications;
create policy gst_verifications_public_read on public.gst_verifications
  for select to anon, authenticated
  using (is_current = true);

drop policy if exists gst_verifications_admin_write on public.gst_verifications;
create policy gst_verifications_admin_write on public.gst_verifications
  for all to authenticated
  using (public.is_admin_role())
  with check (public.is_admin_role());

-- ── reviews ──────────────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  overall_rating integer not null check (overall_rating between 1 and 5),
  quality_rating integer check (quality_rating between 1 and 5),
  delivery_rating integer check (delivery_rating between 1 and 5),
  communication_rating integer check (communication_rating between 1 and 5),
  pricing_rating integer check (pricing_rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, reviewer_id, quote_id)
);

create index if not exists reviews_supplier_idx on public.reviews(supplier_id);
create index if not exists reviews_reviewer_idx on public.reviews(reviewer_id);
create index if not exists reviews_created_at_idx on public.reviews(created_at desc);
create index if not exists reviews_published_idx on public.reviews(is_published) where is_published = true;

alter table public.reviews enable row level security;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (is_published = true or reviewer_id = auth.uid() or public.is_admin_role());

drop policy if exists reviews_buyer_insert on public.reviews;
create policy reviews_buyer_insert on public.reviews
  for insert to authenticated
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_buyer_update on public.reviews;
create policy reviews_buyer_update on public.reviews
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

-- ── review_responses ─────────────────────────────────────────────────────────

create table if not exists public.review_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade unique,
  responder_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.review_responses enable row level security;

drop policy if exists review_responses_public_read on public.review_responses;
create policy review_responses_public_read on public.review_responses
  for select to anon, authenticated
  using (true);

drop policy if exists review_responses_supplier_write on public.review_responses;
create policy review_responses_supplier_write on public.review_responses
  for all to authenticated
  using (responder_id = auth.uid())
  with check (responder_id = auth.uid());

-- ── whatsapp_events ──────────────────────────────────────────────────────────

create table if not exists public.whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  phone_number text not null,
  event_type text not null,
  template_name text,
  template_params jsonb default '{}'::jsonb,
  delivery_status text not null default 'queued',
  provider_message_id text,
  provider text not null default 'gupshup',
  error_message text,
  deep_link_url text,
  metadata jsonb default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_events_user_idx on public.whatsapp_events(user_id);
create index if not exists whatsapp_events_type_idx on public.whatsapp_events(event_type);
create index if not exists whatsapp_events_status_idx on public.whatsapp_events(delivery_status);
create index if not exists whatsapp_events_created_at_idx on public.whatsapp_events(created_at desc);

alter table public.whatsapp_events enable row level security;

drop policy if exists whatsapp_events_admin on public.whatsapp_events;
create policy whatsapp_events_admin on public.whatsapp_events
  for all to authenticated
  using (public.is_admin_role() or user_id = auth.uid())
  with check (public.is_admin_role());

-- ── platform_events (unified analytics event bus) ────────────────────────────

create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  resource_type text, -- rfq, quote, inquiry, supplier, review, message
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists platform_events_type_idx on public.platform_events(event_type);
create index if not exists platform_events_actor_idx on public.platform_events(actor_id);
create index if not exists platform_events_resource_idx on public.platform_events(resource_type, resource_id);
create index if not exists platform_events_created_at_idx on public.platform_events(created_at desc);
-- Partitioned index for time-range analytics queries
create index if not exists platform_events_type_time_idx on public.platform_events(event_type, created_at desc);

alter table public.platform_events enable row level security;

drop policy if exists platform_events_admin_read on public.platform_events;
create policy platform_events_admin_read on public.platform_events
  for select to authenticated
  using (public.is_admin_role());

drop policy if exists platform_events_insert on public.platform_events;
create policy platform_events_insert on public.platform_events
  for insert to authenticated
  with check (true);

-- ── guest_rfq_tokens ─────────────────────────────────────────────────────────

create table if not exists public.guest_rfq_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  rfq_data jsonb not null, -- full RFQ form data from localStorage
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  rfq_id uuid references public.rfqs(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists guest_rfq_tokens_token_idx on public.guest_rfq_tokens(token);
create index if not exists guest_rfq_tokens_claimed_idx on public.guest_rfq_tokens(claimed_by) where claimed_by is not null;
create index if not exists guest_rfq_tokens_expires_idx on public.guest_rfq_tokens(expires_at);

alter table public.guest_rfq_tokens enable row level security;

-- Guests can read by token (via API), authenticated can claim
drop policy if exists guest_rfq_tokens_anon_read on public.guest_rfq_tokens;
create policy guest_rfq_tokens_anon_read on public.guest_rfq_tokens
  for select to anon, authenticated
  using (true);

drop policy if exists guest_rfq_tokens_insert on public.guest_rfq_tokens;
create policy guest_rfq_tokens_insert on public.guest_rfq_tokens
  for insert to anon, authenticated
  with check (true);

drop policy if exists guest_rfq_tokens_claim on public.guest_rfq_tokens;
create policy guest_rfq_tokens_claim on public.guest_rfq_tokens
  for update to authenticated
  using (claimed_by is null or claimed_by = auth.uid())
  with check (claimed_by = auth.uid());

-- ── Triggers ─────────────────────────────────────────────────────────────────

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists review_responses_set_updated_at on public.review_responses;
create trigger review_responses_set_updated_at
before update on public.review_responses
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists quote_comparisons_set_updated_at on public.quote_comparisons;
create trigger quote_comparisons_set_updated_at
before update on public.quote_comparisons
for each row execute function public.set_updated_at();

-- ── Function: Update supplier review aggregates ──────────────────────────────

create or replace function public.refresh_supplier_review_stats(target_supplier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stats record;
begin
  select
    count(*)::integer as review_count,
    coalesce(round(avg(overall_rating)::numeric, 2), 0) as review_avg
  into stats
  from public.reviews
  where supplier_id = target_supplier_id
    and is_published = true;

  update public.suppliers
  set review_count = stats.review_count,
      review_avg = stats.review_avg,
      updated_at = now()
  where id = target_supplier_id;
end;
$$;

-- Trigger to auto-refresh review stats
create or replace function public.trigger_refresh_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_supplier_review_stats(coalesce(new.supplier_id, old.supplier_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_stats on public.reviews;
create trigger reviews_refresh_stats
after insert or update or delete on public.reviews
for each row execute function public.trigger_refresh_review_stats();

-- ── Function: Get supplier review stats (for API/profile) ────────────────────

create or replace function public.get_supplier_review_stats(target_supplier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'overall_avg', coalesce(round(avg(overall_rating)::numeric, 2), 0),
    'quality_avg', coalesce(round(avg(quality_rating)::numeric, 2), 0),
    'delivery_avg', coalesce(round(avg(delivery_rating)::numeric, 2), 0),
    'communication_avg', coalesce(round(avg(communication_rating)::numeric, 2), 0),
    'pricing_avg', coalesce(round(avg(pricing_rating)::numeric, 2), 0),
    'total_count', count(*),
    'verified_count', count(*) filter (where is_verified_purchase),
    'rating_distribution', jsonb_build_object(
      '5', count(*) filter (where overall_rating = 5),
      '4', count(*) filter (where overall_rating = 4),
      '3', count(*) filter (where overall_rating = 3),
      '2', count(*) filter (where overall_rating = 2),
      '1', count(*) filter (where overall_rating = 1)
    )
  )
  from public.reviews
  where supplier_id = target_supplier_id
    and is_published = true;
$$;

-- ── Function: Match RFQs to suppliers (capability/industry/location) ─────────

create or replace function public.match_rfqs_to_supplier(target_supplier_id uuid, max_results integer default 20)
returns table (
  rfq_id uuid,
  title text,
  slug text,
  description text,
  quantity text,
  budget_range text,
  city text,
  state text,
  status text,
  created_at timestamptz,
  match_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with supplier_caps as (
    select capability_id from public.supplier_capabilities where supplier_id = target_supplier_id
  ),
  supplier_inds as (
    select industry_id from public.supplier_industries where supplier_id = target_supplier_id
  ),
  supplier_loc as (
    select s.city, s.state from public.suppliers s where s.id = target_supplier_id
  )
  select
    r.id as rfq_id,
    r.title,
    r.slug,
    r.description,
    r.quantity,
    r.budget_range,
    r.city,
    r.state,
    r.status::text,
    r.created_at,
    (
      -- Capability match (40 pts per match)
      coalesce((
        select count(*)::integer * 40
        from public.rfq_capabilities rc
        where rc.rfq_id = r.id and rc.capability_id in (select capability_id from supplier_caps)
      ), 0)
      +
      -- Industry match (30 pts per match)
      coalesce((
        select count(*)::integer * 30
        from public.rfq_industries ri
        where ri.rfq_id = r.id and ri.industry_id in (select industry_id from supplier_inds)
      ), 0)
      +
      -- Location match (20 pts for state, 10 bonus for city)
      case when r.state = (select state from supplier_loc limit 1) then 20 else 0 end
      +
      case when r.city = (select city from supplier_loc limit 1) then 10 else 0 end
    )::integer as match_score
  from public.rfqs r
  where r.status in ('open', 'in_review')
    and r.created_at > now() - interval '90 days'
  order by match_score desc, r.created_at desc
  limit max_results;
$$;

-- ── Done ─────────────────────────────────────────────────────────────────────
