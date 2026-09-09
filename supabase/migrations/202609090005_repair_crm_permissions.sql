-- Ensure CRM projection and protected API routes can read/write their canonical tables.
-- RLS policies remain authoritative for row-level access.

grant select, insert, update, delete on table public.leads to authenticated;
grant select, insert, update, delete on table public.lead_activities to authenticated;
grant select on table public.leads to service_role;
grant select on table public.lead_activities to service_role;

alter table if exists public.leads enable row level security;
alter table if exists public.lead_activities enable row level security;
