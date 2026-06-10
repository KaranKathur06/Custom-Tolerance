-- Supplier gallery + direct inquiries (procurement ecosystem supplement)
-- Prerequisites: 202606100001_procurement_ecosystem.sql

do $$
begin
  create type public.gallery_category as enum (
    'factory',
    'machine',
    'product',
    'quality_lab',
    'certificate'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inquiry_source as enum (
    'profile',
    'listing',
    'search',
    'capability'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inquiry_status as enum (
    'pending',
    'viewed',
    'responded',
    'quoted',
    'closed'
  );
exception when duplicate_object then null;
end $$;

-- ── supplier_gallery ─────────────────────────────────────────────────────────

create table if not exists public.supplier_gallery (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  category public.gallery_category not null default 'factory',
  image_url text not null,
  storage_path text,
  caption text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_gallery_supplier_category_idx
  on public.supplier_gallery(supplier_id, category, sort_order);

alter table public.supplier_gallery enable row level security;

drop policy if exists supplier_gallery_public_read on public.supplier_gallery;
create policy supplier_gallery_public_read on public.supplier_gallery
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists supplier_gallery_owner_write on public.supplier_gallery;
create policy supplier_gallery_owner_write on public.supplier_gallery
  for all to authenticated
  using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or public.is_admin_role()
  )
  with check (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or public.is_admin_role()
  );

drop trigger if exists supplier_gallery_set_updated_at on public.supplier_gallery;
create trigger supplier_gallery_set_updated_at
before update on public.supplier_gallery
for each row execute function public.set_updated_at();

-- ── inquiries (direct buyer → supplier) ──────────────────────────────────────

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  source public.inquiry_source not null default 'profile',
  subject text,
  message text not null,
  quantity text,
  timeline text,
  status public.inquiry_status not null default 'pending',
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_supplier_idx on public.inquiries(supplier_id, created_at desc);
create index if not exists inquiries_buyer_idx on public.inquiries(buyer_user_id, created_at desc);
create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiries_unread_idx on public.inquiries(supplier_id) where is_read = false;

alter table public.inquiries enable row level security;

drop policy if exists inquiries_buyer_read on public.inquiries;
create policy inquiries_buyer_read on public.inquiries
  for select to authenticated
  using (
    buyer_user_id = auth.uid()
    or exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or public.is_admin_role()
  );

drop policy if exists inquiries_buyer_insert on public.inquiries;
create policy inquiries_buyer_insert on public.inquiries
  for insert to authenticated
  with check (buyer_user_id = auth.uid());

drop policy if exists inquiries_participant_update on public.inquiries;
create policy inquiries_participant_update on public.inquiries
  for update to authenticated
  using (
    buyer_user_id = auth.uid()
    or exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or public.is_admin_role()
  )
  with check (
    buyer_user_id = auth.uid()
    or exists (
      select 1 from public.suppliers s
      where s.id = supplier_id and s.owner_user_id = auth.uid()
    )
    or public.is_admin_role()
  );

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();

grant select on public.supplier_gallery to anon, authenticated;
grant select, insert, update on public.inquiries to authenticated;
