-- CT-IRFQ™ Premium Ecosystem (Phase P1–P4)
-- Capability matrix, risk assessments, collaboration, enhanced matching

-- ── Prerequisites (safe if 202606200002 already applied) ─────────────────────

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

-- ── Reference: machines & inspection ──────────────────────────────────────────

create table if not exists public.ref_machine_types (
  slug text primary key,
  name text not null,
  category text not null default 'cnc',
  sort_order integer not null default 100
);

create table if not exists public.ref_inspection_equipment (
  slug text primary key,
  name text not null,
  sort_order integer not null default 100
);

create table if not exists public.ref_certifications (
  slug text primary key,
  name text not null,
  category text not null default 'quality',
  sort_order integer not null default 100
);

alter table public.ref_machine_types enable row level security;
alter table public.ref_inspection_equipment enable row level security;
alter table public.ref_certifications enable row level security;

drop policy if exists ref_machine_types_public_read on public.ref_machine_types;
create policy ref_machine_types_public_read on public.ref_machine_types
  for select to anon, authenticated using (true);

drop policy if exists ref_inspection_equipment_public_read on public.ref_inspection_equipment;
create policy ref_inspection_equipment_public_read on public.ref_inspection_equipment
  for select to anon, authenticated using (true);

drop policy if exists ref_certifications_public_read on public.ref_certifications;
create policy ref_certifications_public_read on public.ref_certifications
  for select to anon, authenticated using (true);

insert into public.ref_machine_types (slug, name, category, sort_order) values
  ('3_axis_cnc', '3 Axis CNC', 'cnc', 10),
  ('5_axis_cnc', '5 Axis CNC', 'cnc', 20),
  ('vmc', 'VMC', 'cnc', 30),
  ('hmc', 'HMC', 'cnc', 40),
  ('cnc_turning', 'CNC Turning', 'cnc', 50),
  ('swiss_turning', 'Swiss Turning', 'cnc', 60),
  ('laser_cutting', 'Laser Cutting', 'cutting', 70),
  ('plasma_cutting', 'Plasma Cutting', 'cutting', 80),
  ('waterjet', 'Waterjet Cutting', 'cutting', 90),
  ('edm', 'EDM', 'edm', 100),
  ('wire_edm', 'Wire EDM', 'edm', 110),
  ('grinding', 'Grinding', 'finishing', 120),
  ('honing', 'Honing', 'finishing', 130)
on conflict (slug) do nothing;

insert into public.ref_inspection_equipment (slug, name, sort_order) values
  ('cmm', 'CMM', 10),
  ('optical_comparator', 'Optical Comparator', 20),
  ('surface_roughness_tester', 'Surface Roughness Tester', 30),
  ('hardness_tester', 'Hardness Tester', 40),
  ('cmm_portable', 'Portable CMM', 50),
  ('profile_projector', 'Profile Projector', 60),
  ('ultrasonic_tester', 'Ultrasonic Tester', 70),
  ('xray_inspection', 'X-Ray Inspection', 80)
on conflict (slug) do nothing;

insert into public.ref_certifications (slug, name, category, sort_order) values
  ('iso_9001', 'ISO 9001', 'quality', 10),
  ('iso_14001', 'ISO 14001', 'environmental', 20),
  ('iso_13485', 'ISO 13485', 'medical', 30),
  ('iatf_16949', 'IATF 16949', 'automotive', 40),
  ('as9100', 'AS9100', 'aerospace', 50),
  ('nadcap', 'NADCAP', 'aerospace', 60),
  ('ce', 'CE', 'regulatory', 70),
  ('ul', 'UL', 'regulatory', 80),
  ('rohs', 'RoHS', 'regulatory', 90),
  ('reach', 'REACH', 'regulatory', 100),
  ('fda', 'FDA', 'medical', 110)
on conflict (slug) do nothing;

-- ── Supplier capability matrix ───────────────────────────────────────────────

create table if not exists public.supplier_capability_matrix (
  supplier_id uuid primary key references public.suppliers(id) on delete cascade,
  machine_types text[] not null default '{}',
  max_part_length_mm numeric,
  max_part_width_mm numeric,
  max_part_height_mm numeric,
  min_tolerance_mm numeric,
  daily_capacity_units numeric,
  monthly_capacity_units numeric,
  capacity_unit text default 'pieces',
  inspection_equipment text[] not null default '{}',
  materials_supported text[] not null default '{}',
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists supplier_capability_matrix_machines_idx
  on public.supplier_capability_matrix using gin (machine_types);

alter table public.supplier_capability_matrix enable row level security;

drop policy if exists supplier_capability_matrix_public_read on public.supplier_capability_matrix;
create policy supplier_capability_matrix_public_read on public.supplier_capability_matrix
  for select to authenticated using (true);

drop policy if exists supplier_capability_matrix_owner_write on public.supplier_capability_matrix;
create policy supplier_capability_matrix_owner_write on public.supplier_capability_matrix
  for all to authenticated
  using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.suppliers s
      join public.seller_profiles sp on sp.id = s.seller_profile_id
      where s.id = supplier_id and sp.profile_id = auth.uid()
    )
    or public.is_admin_role()
  )
  with check (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.suppliers s
      join public.seller_profiles sp on sp.id = s.seller_profile_id
      where s.id = supplier_id and sp.profile_id = auth.uid()
    )
    or public.is_admin_role()
  );

-- ── RFQ capability requirements ────────────────────────────────────────────────

create table if not exists public.rfq_capability_requirements (
  rfq_id uuid primary key references public.rfqs(id) on delete cascade,
  required_machines text[] not null default '{}',
  max_part_length_mm numeric,
  max_part_width_mm numeric,
  max_part_height_mm numeric,
  min_tolerance_mm numeric,
  min_daily_capacity numeric,
  min_monthly_capacity numeric,
  required_inspection text[] not null default '{}'
);

alter table public.rfqs
  add column if not exists capability_matrix_filters jsonb default '{}'::jsonb,
  add column if not exists delivery_country char(2),
  add column if not exists quote_probability_score numeric(5,2),
  add column if not exists smart_expiry_at timestamptz,
  add column if not exists approval_status text default 'none';

alter table public.rfq_capability_requirements enable row level security;

drop policy if exists rfq_capability_requirements_owner on public.rfq_capability_requirements;
create policy rfq_capability_requirements_owner on public.rfq_capability_requirements
  for all to authenticated
  using (public.irfq_user_owns_rfq(rfq_id))
  with check (public.irfq_user_owns_rfq(rfq_id));

-- ── Risk assessments ───────────────────────────────────────────────────────────

create table if not exists public.rfq_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  risk_level public.irfq_risk_level not null,
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  factors jsonb not null default '[]'::jsonb,
  supplier_pool_size integer,
  suggestions jsonb default '[]'::jsonb,
  computed_at timestamptz not null default now()
);

create index if not exists rfq_risk_assessments_rfq_idx
  on public.rfq_risk_assessments (rfq_id, computed_at desc);

alter table public.rfq_risk_assessments enable row level security;

drop policy if exists rfq_risk_assessments_owner on public.rfq_risk_assessments;
create policy rfq_risk_assessments_owner on public.rfq_risk_assessments
  for select to authenticated
  using (public.irfq_user_owns_rfq(rfq_id) or public.is_admin_role());

drop policy if exists rfq_risk_assessments_insert on public.rfq_risk_assessments;
create policy rfq_risk_assessments_insert on public.rfq_risk_assessments
  for insert to authenticated
  with check (public.irfq_user_owns_rfq(rfq_id) or public.is_admin_role());

-- ── Collaboration workspace ──────────────────────────────────────────────────

create table if not exists public.rfq_collaborators (
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (rfq_id, user_id)
);

create table if not exists public.rfq_comments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  parent_id uuid references public.rfq_comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  mentions uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rfq_comments_rfq_idx on public.rfq_comments (rfq_id, created_at desc);

create table if not exists public.rfq_versions (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rfq_id, version_number)
);

create table if not exists public.rfq_approvals (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  version_id uuid references public.rfq_versions(id) on delete set null,
  approver_role text not null,
  approver_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rfq_collaborators enable row level security;
alter table public.rfq_comments enable row level security;
alter table public.rfq_versions enable row level security;
alter table public.rfq_approvals enable row level security;

create or replace function public.irfq_user_can_collaborate(target_rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.irfq_user_owns_rfq(target_rfq_id)
    or exists (
      select 1 from public.rfq_collaborators c
      where c.rfq_id = target_rfq_id
        and c.user_id = auth.uid()
        and c.accepted_at is not null
    );
$$;

drop policy if exists rfq_collaborators_access on public.rfq_collaborators;
create policy rfq_collaborators_access on public.rfq_collaborators
  for all to authenticated
  using (public.irfq_user_owns_rfq(rfq_id) or user_id = auth.uid())
  with check (public.irfq_user_owns_rfq(rfq_id));

drop policy if exists rfq_comments_collab on public.rfq_comments;
create policy rfq_comments_collab on public.rfq_comments
  for all to authenticated
  using (public.irfq_user_can_collaborate(rfq_id))
  with check (public.irfq_user_can_collaborate(rfq_id) and author_id = auth.uid());

drop policy if exists rfq_versions_owner on public.rfq_versions;
create policy rfq_versions_owner on public.rfq_versions
  for select to authenticated
  using (public.irfq_user_can_collaborate(rfq_id));

drop policy if exists rfq_versions_insert on public.rfq_versions;
create policy rfq_versions_insert on public.rfq_versions
  for insert to authenticated
  with check (public.irfq_user_owns_rfq(rfq_id));

drop policy if exists rfq_approvals_collab on public.rfq_approvals;
create policy rfq_approvals_collab on public.rfq_approvals
  for all to authenticated
  using (public.irfq_user_can_collaborate(rfq_id))
  with check (public.irfq_user_can_collaborate(rfq_id));

-- ── IRFQ subscriptions ───────────────────────────────────────────────────────

create table if not exists public.irfq_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid,
  plan_slug public.irfq_subscription_plan not null,
  status text not null default 'active',
  razorpay_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists irfq_subscriptions_user_idx on public.irfq_subscriptions (user_id, status);

alter table public.irfq_subscriptions enable row level security;

drop policy if exists irfq_subscriptions_own on public.irfq_subscriptions;
create policy irfq_subscriptions_own on public.irfq_subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin_role());

alter table public.irfq_usage_counters
  add column if not exists drawing_ai_parses integer not null default 0,
  add column if not exists match_reruns integer not null default 0;

-- ── Enhanced matching RPC ──────────────────────────────────────────────────────

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
  cap_req record;
  match_limit integer;
begin
  select r.* into rfq_rec from public.rfqs r where r.id = target_rfq_id;
  if rfq_rec is null then return; end if;

  select * into cap_req from public.rfq_capability_requirements where rfq_id = target_rfq_id;

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
        + coalesce((
          select count(*)::numeric * 5
          from unnest(coalesce(cap_req.required_machines, '{}')) rm
          where rm = any(coalesce(scm.machine_types, '{}'))
        ), 0)
        + case
            when cap_req.min_tolerance_mm is not null
             and scm.min_tolerance_mm is not null
             and scm.min_tolerance_mm <= cap_req.min_tolerance_mm then 10
            when cap_req.min_tolerance_mm is not null
             and scm.min_tolerance_mm is not null
             and scm.min_tolerance_mm <= cap_req.min_tolerance_mm * 2 then 5
            else 0
          end
        + case
            when cap_req.max_part_length_mm is not null
             and scm.max_part_length_mm >= cap_req.max_part_length_mm then 8
            else 0
          end
        + case
            when coalesce((
              select rsr.iso_certified from public.rfq_supplier_requirements rsr
              where rsr.rfq_id = target_rfq_id
            ), false)
            and s.verification_status::text = 'verified' then 8 else 0 end
        + case
            when coalesce((
              select rsr.export_experience from public.rfq_supplier_requirements rsr
              where rsr.rfq_id = target_rfq_id
            ), false)
            and s.export_capability then 6 else 0 end
        + case
            when coalesce((
              select rsr.verified_supplier from public.rfq_supplier_requirements rsr
              where rsr.rfq_id = target_rfq_id
            ), false)
            and s.verification_status::text = 'verified' then 6 else 0 end
      )::numeric(5,2) as calc_score,
      jsonb_build_object(
        'capability', coalesce((select count(*) from public.supplier_capabilities sc where sc.supplier_id = s.id and sc.capability_id in (select capability_id from rfq_caps)), 0),
        'industry', coalesce((select count(*) from public.supplier_industries si where si.supplier_id = s.id and si.industry_id in (select industry_id from rfq_inds)), 0),
        'location_state', case when rfq_rec.state = s.state then 15 else 0 end,
        'location_city', case when rfq_rec.city = s.city then 8 else 0 end,
        'matrix_machines', coalesce((
          select count(*) from unnest(coalesce(cap_req.required_machines, '{}')) rm
          where rm = any(coalesce(scm.machine_types, '{}'))
        ), 0),
        'tolerance_fit', case
          when cap_req.min_tolerance_mm is not null and scm.min_tolerance_mm <= cap_req.min_tolerance_mm then 10
          else 0 end
      ) as breakdown
    from public.suppliers s
    left join public.supplier_capability_matrix scm on scm.supplier_id = s.id
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
      case when (scored.breakdown->>'matrix_machines')::int > 0 then 'Required machines available' end,
      case when (scored.breakdown->>'tolerance_fit')::int > 0 then 'Tolerance capability verified' end,
      case when (scored.breakdown->>'location_state')::int > 0 then 'Same state delivery preference' end,
      case when (scored.breakdown->>'location_city')::int > 0 then 'Same city delivery preference' end
    ], null) as explanation
  from scored
  where scored.calc_score >= min_score
  order by scored.calc_score desc
  limit match_limit;
end;
$$;
