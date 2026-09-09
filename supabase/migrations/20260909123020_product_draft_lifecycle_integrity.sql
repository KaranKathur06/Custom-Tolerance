-- Versioned product-draft writes and private product-media invariants.
-- This migration is additive and deliberately does not modify existing bucket
-- visibility or delete storage objects.

alter table public.seller_products
  add column if not exists draft_version bigint not null default 1;

alter table public.product_images
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.seller_products
set draft_version = 1
where draft_version is null;

create unique index if not exists product_images_one_active_primary
  on public.product_images (seller_product_id)
  where is_primary and deleted_at is null;

create unique index if not exists product_images_active_display_order
  on public.product_images (seller_product_id, display_order)
  where deleted_at is null;

create or replace function public.update_product_draft(
  p_product_id uuid,
  p_expected_version bigint,
  p_patch jsonb default '{}'::jsonb,
  p_relations jsonb default '{}'::jsonb
) returns table (product_id uuid, draft_version bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.seller_products%rowtype;
  v_field text;
  v_items jsonb;
  v_table text;
  v_column text;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  if v_product.is_published or v_product.approval_status not in ('draft', 'rejected') then
    raise exception 'PRODUCT_NOT_EDITABLE' using errcode = 'P0001';
  end if;
  if v_product.draft_version <> p_expected_version then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  -- The API whitelists fields before this RPC. jsonb_populate_record retains
  -- omitted values and avoids replacing the aggregate with a partial payload.
  update public.seller_products
  set product_name = coalesce(p_patch->>'product_name', product_name),
      price_type = coalesce(p_patch->>'price_type', price_type),
      currency = coalesce(p_patch->>'currency', currency),
      price_unit = coalesce(p_patch->>'price_unit', price_unit),
      description = coalesce(p_patch->>'description', description),
      tolerance_capability = coalesce(p_patch->>'tolerance_capability', tolerance_capability),
      lead_time = coalesce(p_patch->>'lead_time', lead_time),
      updated_at = now(),
      draft_version = draft_version + 1
  where id = p_product_id
  returning * into v_product;

  for v_field, v_table, v_column in
    select * from (values
      ('materials', 'product_materials', 'material_name'),
      ('grades', 'product_grades', 'grade_name'),
      ('capabilities', 'product_capabilities', 'capability_id'),
      ('industries', 'product_industries', 'industry_id'),
      ('paymentTerms', 'product_payment_terms', 'payment_term_id'),
      ('incoterms', 'product_incoterms', 'incoterm_id')
    ) as fields(field_name, table_name, column_name)
  loop
    if p_relations ? v_field then
      v_items := p_relations -> v_field;
      execute format('delete from public.%I where seller_product_id = $1', v_table) using p_product_id;
      execute format(
        'insert into public.%I (seller_product_id, %I) select $1, value from jsonb_array_elements_text($2) value where btrim(value) <> '''' on conflict do nothing',
        v_table, v_column
      ) using p_product_id, v_items;
    end if;
  end loop;

  return query select v_product.id, v_product.draft_version;
end;
$$;

-- Draft uploads are server-owned. Do not grant authenticated browser users
-- direct product-image object mutation rights; the route uses a service role
-- only after user/product ownership and media validation.
drop policy if exists product_images_authenticated_insert on storage.objects;
drop policy if exists product_images_owner_update on storage.objects;
drop policy if exists product_images_owner_delete on storage.objects;
