-- Repair product draft persistence for environments where the normalized product migration was skipped.

alter table if exists public.seller_products
  add column if not exists price_type text default 'ask_for_price',
  add column if not exists currency text default 'USD',
  add column if not exists price_unit text default 'per_piece',
  add column if not exists min_price numeric,
  add column if not exists max_price numeric,
  add column if not exists description text,
  add column if not exists country_of_origin text,
  add column if not exists third_party_inspection boolean default false,
  add column if not exists free_sample boolean default false,
  add column if not exists sample_shipping_cost text,
  add column if not exists delivery_terms text,
  add column if not exists weight_value numeric,
  add column if not exists weight_unit text default 'kg',
  add column if not exists dim_length numeric,
  add column if not exists dim_width numeric,
  add column if not exists dim_height numeric,
  add column if not exists dim_unit text default 'mm',
  add column if not exists shipping_type text default 'packed',
  add column if not exists primary_packaging text,
  add column if not exists secondary_packaging text,
  add column if not exists packaging_notes text,
  add column if not exists quality_certificate text,
  add column if not exists brand_marking text,
  add column if not exists brand_marking_other text,
  add column if not exists dies_and_tools text,
  add column if not exists estimated_tool_cost numeric,
  add column if not exists tool_ownership text,
  add column if not exists tool_lead_time text,
  add column if not exists specification text;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  url text not null,
  storage_path text not null,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_capabilities (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  capability_id text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, capability_id)
);

create table if not exists public.product_industries (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  industry_id text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, industry_id)
);

create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  material_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, material_name)
);

create table if not exists public.product_grades (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  grade_name text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, grade_name)
);

create table if not exists public.product_payment_terms (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  payment_term_id text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, payment_term_id)
);

create table if not exists public.product_incoterms (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  incoterm_id text not null,
  created_at timestamptz not null default now(),
  unique (seller_product_id, incoterm_id)
);

alter table public.product_images enable row level security;
alter table public.product_capabilities enable row level security;
alter table public.product_industries enable row level security;
alter table public.product_materials enable row level security;
alter table public.product_grades enable row level security;
alter table public.product_payment_terms enable row level security;
alter table public.product_incoterms enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_images' and policyname = 'product_images_owner_all') then
    create policy product_images_owner_all on public.product_images for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_capabilities' and policyname = 'product_capabilities_owner_all') then
    create policy product_capabilities_owner_all on public.product_capabilities for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_industries' and policyname = 'product_industries_owner_all') then
    create policy product_industries_owner_all on public.product_industries for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_materials' and policyname = 'product_materials_owner_all') then
    create policy product_materials_owner_all on public.product_materials for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_grades' and policyname = 'product_grades_owner_all') then
    create policy product_grades_owner_all on public.product_grades for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_payment_terms' and policyname = 'product_payment_terms_owner_all') then
    create policy product_payment_terms_owner_all on public.product_payment_terms for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_incoterms' and policyname = 'product_incoterms_owner_all') then
    create policy product_incoterms_owner_all on public.product_incoterms for all to authenticated
      using (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()))
      with check (exists (select 1 from public.seller_products p where p.id = seller_product_id and p.profile_id = auth.uid()));
  end if;
end $$;
