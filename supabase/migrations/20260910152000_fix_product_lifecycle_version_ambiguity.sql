-- Fix all approved-product lifecycle RPCs that shadow the draft_version
-- output column with seller_products.draft_version.

create or replace function public.publish_approved_seller_product(
  p_product_id uuid,
  p_expected_version bigint
)
returns table (product_id uuid, lifecycle_status text, approval_status text, is_published boolean, is_visible boolean, draft_version bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product public.seller_products%rowtype;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  if v_product.approval_status <> 'approved' then
    raise exception 'PRODUCT_NOT_APPROVED' using errcode = 'P0001';
  end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  update public.seller_products as sp
  set lifecycle_status = 'active',
      is_published = true,
      is_visible = false,
      published_at = now(),
      updated_at = now(),
      draft_version = coalesce(sp.draft_version, 1) + 1
  where sp.id = p_product_id
  returning sp.* into v_product;

  insert into public.product_audit_events (seller_product_id, actor_id, action, metadata)
  values (p_product_id, auth.uid(), 'product_published', jsonb_build_object('is_visible', false));

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status,
    v_product.is_published, v_product.is_visible, v_product.draft_version;
end;
$$;

create or replace function public.set_seller_product_visibility(
  p_product_id uuid,
  p_expected_version bigint,
  p_is_visible boolean
)
returns table (product_id uuid, is_visible boolean, draft_version bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product public.seller_products%rowtype;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  if v_product.approval_status <> 'approved' or v_product.lifecycle_status <> 'active' or not v_product.is_published then
    raise exception 'PRODUCT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  update public.seller_products as sp
  set is_visible = p_is_visible,
      updated_at = now(),
      draft_version = coalesce(sp.draft_version, 1) + 1
  where sp.id = p_product_id
  returning sp.* into v_product;

  insert into public.product_audit_events (seller_product_id, actor_id, action, metadata)
  values (
    p_product_id,
    auth.uid(),
    case when p_is_visible then 'product_visibility_enabled' else 'product_visibility_disabled' end,
    jsonb_build_object('is_visible', p_is_visible)
  );

  return query select v_product.id, v_product.is_visible, v_product.draft_version;
end;
$$;

create or replace function public.request_seller_product_feature(
  p_product_id uuid,
  p_expected_version bigint,
  p_requested boolean
)
returns table (product_id uuid, featured_requested boolean, draft_version bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product public.seller_products%rowtype;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  if v_product.approval_status <> 'approved' or v_product.lifecycle_status <> 'active' or not v_product.is_published then
    raise exception 'PRODUCT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  update public.seller_products as sp
  set featured_requested = p_requested,
      updated_at = now(),
      draft_version = coalesce(sp.draft_version, 1) + 1
  where sp.id = p_product_id
  returning sp.* into v_product;

  insert into public.product_audit_events (seller_product_id, actor_id, action, metadata)
  values (
    p_product_id,
    auth.uid(),
    case when p_requested then 'product_feature_requested' else 'product_feature_request_cancelled' end,
    jsonb_build_object('featured_requested', p_requested)
  );

  return query select v_product.id, v_product.featured_requested, v_product.draft_version;
end;
$$;

revoke all on function public.publish_approved_seller_product(uuid, bigint) from public;
grant execute on function public.publish_approved_seller_product(uuid, bigint) to authenticated;
revoke all on function public.set_seller_product_visibility(uuid, bigint, boolean) from public;
grant execute on function public.set_seller_product_visibility(uuid, bigint, boolean) to authenticated;
revoke all on function public.request_seller_product_feature(uuid, bigint, boolean) from public;
grant execute on function public.request_seller_product_feature(uuid, bigint, boolean) to authenticated;
