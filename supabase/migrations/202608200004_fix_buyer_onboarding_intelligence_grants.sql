-- The onboarding V3 migration created RLS policies but did not grant table
-- privileges to authenticated users. PostgreSQL checks grants before RLS.

grant select, insert, update, delete on public.buyer_preferences to authenticated;
grant select, insert, update, delete on public.buyer_industries to authenticated;
grant select, insert, update, delete on public.buyer_category_interests to authenticated;
grant select, insert, update, delete on public.buyer_import_countries to authenticated;
grant select, insert, update, delete on public.profile_privacy_settings to authenticated;
grant insert on public.platform_events to authenticated;

alter table public.buyer_preferences enable row level security;
alter table public.buyer_industries enable row level security;
alter table public.buyer_category_interests enable row level security;
alter table public.buyer_import_countries enable row level security;
alter table public.profile_privacy_settings enable row level security;
alter table public.platform_events enable row level security;

drop policy if exists profile_privacy_owner_rw on public.profile_privacy_settings;
create policy profile_privacy_owner_rw on public.profile_privacy_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists platform_events_insert on public.platform_events;
create policy platform_events_insert on public.platform_events
  for insert to authenticated
  with check (actor_id = auth.uid());

drop policy if exists buyer_preferences_own_all on public.buyer_preferences;
create policy buyer_preferences_own_all on public.buyer_preferences
  for all to authenticated
  using (profile_id = auth.uid() or public.is_admin_role())
  with check (profile_id = auth.uid() or public.is_admin_role());

drop policy if exists buyer_industries_own_all on public.buyer_industries;
create policy buyer_industries_own_all on public.buyer_industries
  for all to authenticated
  using (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ))
  with check (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ));

drop policy if exists buyer_category_interests_own_all on public.buyer_category_interests;
create policy buyer_category_interests_own_all on public.buyer_category_interests
  for all to authenticated
  using (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ))
  with check (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ));

drop policy if exists buyer_import_countries_own_all on public.buyer_import_countries;
create policy buyer_import_countries_own_all on public.buyer_import_countries
  for all to authenticated
  using (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ))
  with check (exists (
    select 1 from public.buyer_profiles bp
    where bp.id = buyer_profile_id
      and (bp.profile_id = auth.uid() or public.is_admin_role())
  ));