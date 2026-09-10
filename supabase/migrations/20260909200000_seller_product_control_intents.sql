-- Seller control intents: visibility may be selected before moderation, while buyer
-- eligibility remains restricted to approved, active, published products.

alter table public.seller_products
  add column if not exists featured_requested boolean not null default false;

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
declare v_product public.seller_products%rowtype;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001'; end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  update public.seller_products
  set is_visible = p_is_visible,
      updated_at = now(),
      draft_version = coalesce(draft_version, 1) + 1
  where id = p_product_id
  returning * into v_product;

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
declare v_product public.seller_products%rowtype;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001'; end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;

  update public.seller_products
  set featured_requested = p_requested,
      updated_at = now(),
      draft_version = coalesce(draft_version, 1) + 1
  where id = p_product_id
  returning * into v_product;

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

revoke all on function public.set_seller_product_visibility(uuid, bigint, boolean) from public;
revoke all on function public.request_seller_product_feature(uuid, bigint, boolean) from public;
grant execute on function public.set_seller_product_visibility(uuid, bigint, boolean) to authenticated;
grant execute on function public.request_seller_product_feature(uuid, bigint, boolean) to authenticated;
