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

create or replace function public.review_seller_product_approval(
  p_approval_id uuid,
  p_action text,
  p_reason text default null,
  p_notes text default null
)
returns table (product_id uuid, lifecycle_status text, approval_status text, draft_version bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_approval public.product_approvals%rowtype; v_product public.seller_products%rowtype;
begin
  if not public.is_marketplace_operator() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = 'P0001'; end if;
  if p_action not in ('approve', 'reject') then raise exception 'INVALID_MODERATION_ACTION' using errcode = 'P0001'; end if;
  if p_action = 'reject' and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'REJECTION_REASON_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_approval from public.product_approvals where id = p_approval_id for update;
  if not found then raise exception 'APPROVAL_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_approval.status <> 'pending' then raise exception 'APPROVAL_NOT_PENDING' using errcode = 'P0001'; end if;
  select * into v_product from public.seller_products where id = v_approval.seller_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001'; end if;

  update public.product_approvals set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = case when p_action = 'reject' then p_reason else null end, notes = p_notes
  where id = p_approval_id;

  update public.seller_products set lifecycle_status = case when p_action = 'approve' then 'active' else 'rejected' end,
    approval_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    is_published = p_action = 'approve',
    is_visible = case when p_action = 'approve' then coalesce(v_product.is_visible, false) else false end,
    published_at = case when p_action = 'approve' then now() else published_at end,
    approved_by = case when p_action = 'approve' then auth.uid() else null end,
    approved_at = case when p_action = 'approve' then now() else null end,
    updated_at = now(), draft_version = coalesce(draft_version, 1) + 1
  where id = v_product.id returning * into v_product;

  insert into public.product_audit_events (seller_product_id, approval_id, actor_id, action, metadata)
  values (v_product.id, p_approval_id, auth.uid(), case when p_action = 'approve' then 'product_approved' else 'product_rejected' end, jsonb_build_object('reason', p_reason, 'notes', p_notes));

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status, v_product.draft_version;
end;
$$;

revoke all on function public.set_seller_product_visibility(uuid, bigint, boolean) from public;
revoke all on function public.request_seller_product_feature(uuid, bigint, boolean) from public;
revoke all on function public.review_seller_product_approval(uuid, text, text, text) from public;
grant execute on function public.set_seller_product_visibility(uuid, bigint, boolean) to authenticated;
grant execute on function public.request_seller_product_feature(uuid, bigint, boolean) to authenticated;
grant execute on function public.review_seller_product_approval(uuid, text, text, text) to authenticated;
