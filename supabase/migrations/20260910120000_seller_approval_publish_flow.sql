-- Separate moderation approval from seller-controlled marketplace publication.
-- Sellers may improve pending submissions; rejected submissions remain editable and
-- must be resubmitted. Approved products stay hidden until the seller publishes.

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
declare
  v_approval public.product_approvals%rowtype;
  v_product public.seller_products%rowtype;
begin
  if not public.is_marketplace_operator() then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = 'P0001';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'INVALID_MODERATION_ACTION' using errcode = 'P0001';
  end if;
  if p_action = 'reject' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_approval
  from public.product_approvals
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'APPROVAL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_approval.status <> 'pending' then
    raise exception 'APPROVAL_NOT_PENDING' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.seller_products
  where id = v_approval.seller_product_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.product_approvals
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = case when p_action = 'reject' then p_reason else null end,
      notes = p_notes
  where id = p_approval_id;

  update public.seller_products
  set lifecycle_status = case when p_action = 'approve' then 'paused' else 'rejected' end,
      approval_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      approval_notes = coalesce(nullif(btrim(p_notes), ''), nullif(btrim(p_reason), '')),
      is_published = case when p_action = 'approve' then false else false end,
      is_visible = case when p_action = 'approve' then false else false end,
      published_at = case when p_action = 'approve' then null else published_at end,
      approved_by = case when p_action = 'approve' then auth.uid() else null end,
      approved_at = case when p_action = 'approve' then now() else null end,
      updated_at = now(),
      draft_version = coalesce(draft_version, 1) + 1
  where id = v_product.id
  returning * into v_product;

  insert into public.product_audit_events (seller_product_id, approval_id, actor_id, action, metadata)
  values (
    v_product.id,
    p_approval_id,
    auth.uid(),
    case when p_action = 'approve' then 'product_approved' else 'product_rejected' end,
    jsonb_build_object('reason', p_reason, 'notes', p_notes, 'publication_required', p_action = 'approve')
  );

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status, v_product.draft_version;
end;
$$;

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

  update public.seller_products
  set lifecycle_status = 'active',
      is_published = true,
      is_visible = false,
      published_at = now(),
      updated_at = now(),
      draft_version = coalesce(draft_version, 1) + 1
  where id = p_product_id
  returning * into v_product;

  insert into public.product_audit_events (seller_product_id, actor_id, action, metadata)
  values (p_product_id, auth.uid(), 'product_published', jsonb_build_object('is_visible', false));

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status,
    v_product.is_published, v_product.is_visible, v_product.draft_version;
end;
$$;

revoke all on function public.publish_approved_seller_product(uuid, bigint) from public;
grant execute on function public.publish_approved_seller_product(uuid, bigint) to authenticated;
