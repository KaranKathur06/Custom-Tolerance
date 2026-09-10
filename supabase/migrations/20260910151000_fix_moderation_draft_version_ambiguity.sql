-- Fix moderation transaction failure caused by the output column draft_version
-- shadowing seller_products.draft_version inside the PL/pgSQL function.

create or replace function public.review_seller_product_approval_as_admin(
  p_approval_id uuid,
  p_action text,
  p_reason text default null,
  p_notes text default null,
  p_actor_id uuid default null
)
returns table (product_id uuid, lifecycle_status text, approval_status text, draft_version bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_approval public.product_approvals%rowtype;
  v_product public.seller_products%rowtype;
  v_actor_role text;
begin
  select role::text into v_actor_role
  from public.profiles
  where id = p_actor_id;

  if v_actor_role not in ('admin', 'super_admin', 'superadmin') then
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

  begin
    update public.product_approvals
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        reviewed_by = p_actor_id,
        reviewed_at = now(),
        rejection_reason = case when p_action = 'reject' then p_reason else null end,
        notes = p_notes
    where id = p_approval_id;
  exception when others then
    raise exception 'APPROVAL_UPDATE_FAILED: %', sqlerrm using errcode = 'P0001';
  end;

  begin
    update public.seller_products as sp
    set lifecycle_status = case when p_action = 'approve' then 'paused' else 'rejected' end,
        approval_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        approval_notes = coalesce(nullif(btrim(p_notes), ''), nullif(btrim(p_reason), '')),
        is_published = false,
        is_visible = false,
        published_at = case when p_action = 'approve' then null else sp.published_at end,
        approved_by = case when p_action = 'approve' then p_actor_id else null end,
        approved_at = case when p_action = 'approve' then now() else null end,
        updated_at = now(),
        draft_version = coalesce(sp.draft_version, 1) + 1
    where sp.id = v_product.id
    returning sp.* into v_product;
  exception when others then
    raise exception 'PRODUCT_UPDATE_FAILED: %', sqlerrm using errcode = 'P0001';
  end;

  begin
    insert into public.product_audit_events (seller_product_id, approval_id, actor_id, action, metadata)
    values (
      v_product.id,
      p_approval_id,
      p_actor_id,
      case when p_action = 'approve' then 'product_approved' else 'product_rejected' end,
      jsonb_build_object('reason', p_reason, 'notes', p_notes, 'publication_required', p_action = 'approve')
    );
  exception when others then
    raise exception 'AUDIT_INSERT_FAILED: %', sqlerrm using errcode = 'P0001';
  end;

  return query
  select v_product.id, v_product.lifecycle_status, v_product.approval_status, v_product.draft_version;
end;
$$;

revoke all on function public.review_seller_product_approval_as_admin(uuid, text, text, text, uuid) from public;
grant execute on function public.review_seller_product_approval_as_admin(uuid, text, text, text, uuid) to service_role;
