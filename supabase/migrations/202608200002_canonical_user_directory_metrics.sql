-- Canonical connected-user directory.
-- auth.users is the identity source; profiles enrich it when available.
-- LATERAL lookups intentionally select one related company/supplier so joins
-- cannot multiply a single identity into multiple admin rows.

drop view if exists public.admin_user_directory;

create view public.admin_user_directory as
select
  au.id as id,
  coalesce(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') as full_name,
  coalesce(au.email, p.email)::varchar(255) as email,
  p.phone,
  coalesce(p.role::text, au.raw_user_meta_data->>'role', 'buyer') as role,
  au.raw_user_meta_data->>'role' as auth_role,
  p.avatar_url,
  coalesce(p.verification_status::text, 'pending') as verification_status,
  au.created_at as created_at,
  au.last_sign_in_at as last_login,
  coalesce(s.company_name, c.name) as company_name,
  coalesce(p.enforcement_status, 'normal') as enforcement_status,
  coalesce(p.profile_status::text, 'incomplete') as profile_status,
  p.deleted_at
from auth.users au
left join public.profiles p on p.id = au.id
left join lateral (
  select suppliers.company_name
  from public.suppliers
  where suppliers.owner_user_id = au.id
  order by suppliers.created_at desc nulls last
  limit 1
) s on true
left join lateral (
  select companies.name
  from public.companies
  where companies.owner_id = au.id
    and companies.deleted_at is null
  order by companies.created_at desc
  limit 1
) c on true;

grant select on public.admin_user_directory to authenticated;
grant select on public.admin_user_directory to service_role;