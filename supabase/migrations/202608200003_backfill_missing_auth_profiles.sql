-- Repair Auth identities whose profile trigger previously failed or was skipped.
-- This is idempotent and preserves existing profile data.

do $$
declare
  profile_role_udt text;
begin
  select c.udt_name
    into profile_role_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name = 'role';

  -- An earlier identity import can leave an active profile with the same
  -- email but a different ID. Auth remains canonical; archive the stale
  -- profile so the active-email constraint does not block reconciliation.
  update public.profiles stale
  set deleted_at = coalesce(stale.deleted_at, now()),
      updated_at = now()
  from auth.users au
  where stale.id <> au.id
    and stale.deleted_at is null
    and stale.email is not null
    and lower(stale.email) = lower(au.email)
    and not exists (
      select 1
      from public.profiles canonical
      where canonical.id = au.id
    );

  if profile_role_udt = 'mh_user_role' then
    insert into public.profiles (
      id, email, full_name, phone, role, profile_status, trust_level,
      onboarding_step, verification_status, avatar_url
    )
    select
      au.id,
      au.email,
      coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
      coalesce(au.phone, au.raw_user_meta_data->>'phone'),
      case
        when au.raw_user_meta_data->>'role' in ('buyer', 'seller', 'both', 'supplier_success')
          then (au.raw_user_meta_data->>'role')::public.mh_user_role
        else 'buyer'::public.mh_user_role
      end,
      'incomplete'::public.mh_profile_status,
      0,
      1,
      case when au.email_confirmed_at is not null then 'pending' else 'draft' end::public.mh_verification_status,
      au.raw_user_meta_data->>'avatar_url'
    from auth.users au
    where not exists (select 1 from public.profiles p where p.id = au.id);
  elsif profile_role_udt = 'app_role' then
    insert into public.profiles (
      id, email, full_name, phone, role, profile_status, trust_level,
      onboarding_step, verification_status, avatar_url
    )
    select
      au.id,
      au.email,
      coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
      coalesce(au.phone, au.raw_user_meta_data->>'phone'),
      case
        when au.raw_user_meta_data->>'role' in ('super_admin', 'superadmin') then 'superadmin'::public.app_role
        when au.raw_user_meta_data->>'role' = 'admin' then 'admin'::public.app_role
        when au.raw_user_meta_data->>'role' in ('seller', 'both', 'manufacturer', 'distributor') then 'seller'::public.app_role
        else 'buyer'::public.app_role
      end,
      'incomplete'::public.mh_profile_status,
      0,
      1,
      case when au.email_confirmed_at is not null then 'pending' else 'draft' end::public.mh_verification_status,
      au.raw_user_meta_data->>'avatar_url'
    from auth.users au
    where not exists (select 1 from public.profiles p where p.id = au.id);
  else
    raise exception 'Unsupported profiles.role type: %', coalesce(profile_role_udt, 'missing');
  end if;
end $$;

-- Ensure future Auth inserts attempt the same canonical profile bridge.
drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();