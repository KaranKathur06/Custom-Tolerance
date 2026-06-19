-- CustomTolerance Seller Onboarding Upload Foundation
-- Adds Supabase Storage buckets, RLS policies, and metadata columns
-- required for document-centric, fraud-resistant seller onboarding.

create extension if not exists pgcrypto;

-- ── Onboarding session: track validated steps separately from draft saves ─────
alter table if exists public.onboarding_sessions
  add column if not exists validated_steps text[] not null default '{}',
  add column if not exists validated_at timestamptz;

create index if not exists onboarding_sessions_validated_steps_idx
  on public.onboarding_sessions using gin (validated_steps);

-- ── Extend document / media metadata tables for storage bucket tracking ──────
alter table if exists public.supplier_documents
  add column if not exists bucket_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists original_filename text,
  add column if not exists file_fingerprint text;

create index if not exists supplier_documents_fingerprint_idx on public.supplier_documents(file_fingerprint);

alter table if exists public.supplier_media
  add column if not exists bucket_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists original_filename text,
  add column if not exists file_fingerprint text;

create index if not exists supplier_media_fingerprint_idx on public.supplier_media(file_fingerprint);

-- ── Ensure cancelled cheque FK exists on bank details ────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and constraint_name = 'seller_bank_details_cancelled_cheque_document_id_fkey'
      and table_name = 'seller_bank_details'
  ) then
    alter table public.seller_bank_details
      add constraint seller_bank_details_cancelled_cheque_document_id_fkey
      foreign key (cancelled_cheque_document_id) references public.supplier_documents(id) on delete set null;
  end if;
end $$;

-- ── Storage buckets for seller uploads ───────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('seller-documents', 'seller-documents', false),
  ('seller-images', 'seller-images', true),
  ('seller-videos', 'seller-videos', true)
on conflict (id) do update set public = excluded.public;

-- ── Storage RLS: authenticated users can only touch their own folder ──────────
-- Allow authenticated users full control within seller-* buckets under their user id.
drop policy if exists seller_uploads_owner_all on storage.objects;
create policy seller_uploads_owner_all on storage.objects
  for all to authenticated
  using (
    bucket_id in ('seller-documents', 'seller-images', 'seller-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('seller-documents', 'seller-images', 'seller-videos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all seller uploads for review purposes.
drop policy if exists seller_uploads_admin_read on storage.objects;
create policy seller_uploads_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('seller-documents', 'seller-images', 'seller-videos')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('admin', 'super_admin', 'superadmin', 'supplier_success', 'moderator')
    )
  );

-- ── Extend machine / media tables to store uploaded evidence paths ───────────
alter table if exists public.seller_machines
  add column if not exists photo_storage_path text,
  add column if not exists photo_url text,
  add column if not exists datasheet_storage_path text,
  add column if not exists datasheet_url text;
