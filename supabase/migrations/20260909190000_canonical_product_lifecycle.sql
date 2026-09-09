-- Canonical seller-product lifecycle, moderation transitions, and append-only audit records.
-- This is deliberately staged: lifecycle_status stays nullable until the
-- reconciliation report proves every pre-existing row can be mapped safely.

alter table public.seller_products
  add column if not exists lifecycle_status text;

alter table public.product_approvals
  drop constraint if exists product_approvals_status_check;
alter table public.product_approvals
  add constraint product_approvals_status_check
  check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')) not valid;

create table if not exists public.product_audit_events (
  id uuid primary key default gen_random_uuid(),
  seller_product_id uuid not null references public.seller_products(id) on delete restrict,
  approval_id uuid references public.product_approvals(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_audit_events enable row level security;
revoke all on table public.product_audit_events from anon, authenticated;
grant select on table public.product_audit_events to authenticated;

create or replace function public.is_marketplace_operator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'super_admin', 'superadmin')
  );
$$;

revoke all on function public.is_marketplace_operator() from public;
grant execute on function public.is_marketplace_operator() to authenticated;

drop policy if exists product_audit_events_owner_or_operator_select on public.product_audit_events;
create policy product_audit_events_owner_or_operator_select
  on public.product_audit_events for select to authenticated
  using (
    public.is_marketplace_operator()
    or exists (
      select 1 from public.seller_products p
      where p.id = seller_product_id and p.profile_id = auth.uid()
    )
  );

-- Existing rows are mapped only where the existing state is internally clear.
update public.seller_products
set lifecycle_status = case
  when approval_status = 'approved' and coalesce(is_published, false) then 'active'
  when approval_status = 'approved' and not coalesce(is_published, false) then 'paused'
  when approval_status = 'pending_review' then 'pending_review'
  when approval_status = 'rejected' then 'rejected'
  when approval_status = 'draft' then 'draft'
  else null
end
where lifecycle_status is null;

create or replace function public.submit_seller_product_for_review(
  p_product_id uuid,
  p_expected_version bigint
)
returns table (product_id uuid, lifecycle_status text, approval_status text, draft_version bigint, approval_id uuid)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product public.seller_products%rowtype;
  v_approval_id uuid;
begin
  select * into v_product
  from public.seller_products
  where id = p_product_id and profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001';
  end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then
    raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001';
  end if;
  if coalesce(v_product.lifecycle_status, v_product.approval_status) = 'pending_review' then
    select id into v_approval_id from public.product_approvals
    where seller_product_id = p_product_id and status = 'pending'
    order by created_at desc limit 1;
    return query select v_product.id, 'pending_review'::text, 'pending_review'::text, v_product.draft_version, v_approval_id;
    return;
  end if;
  if coalesce(v_product.lifecycle_status, v_product.approval_status) not in ('draft', 'rejected') then
    raise exception 'PRODUCT_NOT_SUBMITTABLE' using errcode = 'P0001';
  end if;

  update public.seller_products
  set lifecycle_status = 'pending_review',
      approval_status = 'pending_review',
      is_published = false,
      updated_at = now(),
      draft_version = coalesce(draft_version, 1) + 1
  where id = p_product_id
  returning * into v_product;

  insert into public.product_approvals (seller_product_id, submitted_by, status)
  values (p_product_id, auth.uid(), 'pending')
  returning id into v_approval_id;

  insert into public.product_audit_events (seller_product_id, approval_id, actor_id, action)
  values (p_product_id, v_approval_id, auth.uid(), 'product_submitted');

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status, v_product.draft_version, v_approval_id;
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
declare v_product public.seller_products%rowtype;
begin
  select * into v_product from public.seller_products
  where id = p_product_id and profile_id = auth.uid() for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED' using errcode = 'P0001'; end if;
  if coalesce(v_product.draft_version, 1) <> coalesce(p_expected_version, 1) then raise exception 'CONFLICT_STALE_DRAFT' using errcode = 'P0001'; end if;
  if v_product.approval_status <> 'approved' or coalesce(v_product.lifecycle_status, 'active') <> 'active' then
    raise exception 'PRODUCT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  update public.seller_products set is_visible = p_is_visible, updated_at = now(), draft_version = coalesce(draft_version, 1) + 1
  where id = p_product_id returning * into v_product;
  insert into public.product_audit_events (seller_product_id, actor_id, action, metadata)
  values (p_product_id, auth.uid(), case when p_is_visible then 'product_visibility_enabled' else 'product_visibility_disabled' end, jsonb_build_object('is_visible', p_is_visible));
  return query select v_product.id, v_product.is_visible, v_product.draft_version;
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
    is_published = p_action = 'approve', published_at = case when p_action = 'approve' then now() else published_at end,
    approved_by = case when p_action = 'approve' then auth.uid() else null end,
    approved_at = case when p_action = 'approve' then now() else null end,
    updated_at = now(), draft_version = coalesce(draft_version, 1) + 1
  where id = v_product.id returning * into v_product;

  insert into public.product_audit_events (seller_product_id, approval_id, actor_id, action, metadata)
  values (v_product.id, p_approval_id, auth.uid(), case when p_action = 'approve' then 'product_approved' else 'product_rejected' end, jsonb_build_object('reason', p_reason, 'notes', p_notes));

  return query select v_product.id, v_product.lifecycle_status, v_product.approval_status, v_product.draft_version;
end;
$$;

revoke all on function public.submit_seller_product_for_review(uuid, bigint) from public;
revoke all on function public.set_seller_product_visibility(uuid, bigint, boolean) from public;
revoke all on function public.review_seller_product_approval(uuid, text, text, text) from public;
grant execute on function public.submit_seller_product_for_review(uuid, bigint) to authenticated;
grant execute on function public.set_seller_product_visibility(uuid, bigint, boolean) to authenticated;
grant execute on function public.review_seller_product_approval(uuid, text, text, text) to authenticated;

