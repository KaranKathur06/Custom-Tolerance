alter table if exists public.profiles
  add column if not exists enforcement_status text not null default 'normal',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists suspension_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references auth.users(id) on delete set null,
  add column if not exists ban_reason text;

alter table if exists public.profiles
  drop constraint if exists profiles_enforcement_status_check;

alter table if exists public.profiles
  add constraint profiles_enforcement_status_check
  check (enforcement_status in ('normal', 'suspended', 'banned'));

create index if not exists profiles_enforcement_status_idx
  on public.profiles(enforcement_status);

drop view if exists public.admin_user_directory;

create view public.admin_user_directory as
select
  coalesce(au.id, p.id) as id,
  coalesce(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') as full_name,
  coalesce(au.email, p.email)::varchar(255) as email,
  p.phone,
  p.role as role,
  p.avatar_url,
  p.verification_status as verification_status,
  coalesce(au.created_at, p.created_at) as created_at,
  au.last_sign_in_at as last_login,
  coalesce(s.company_name, c.name) as company_name,
  au.raw_user_meta_data->>'role' as auth_role,
  coalesce(p.enforcement_status, 'normal') as enforcement_status,
  p.profile_status,
  p.deleted_at
from auth.users au
full outer join public.profiles p on p.id = au.id
left join public.suppliers s on s.owner_user_id = coalesce(au.id, p.id)
left join public.companies c on c.owner_id = coalesce(au.id, p.id);

grant select on public.admin_user_directory to authenticated;
grant select on public.admin_user_directory to service_role;