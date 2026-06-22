-- Ensure the IRFQ usage counters table exists and has the expected columns and RLS policy.

create table if not exists public.irfq_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  rfqs_created integer not null default 0,
  ai_assistant_uses integer not null default 0,
  bom_parses integer not null default 0,
  api_imports integer not null default 0,
  drawing_ai_parses integer not null default 0,
  match_reruns integer not null default 0,
  primary key (user_id, period_start)
);

alter table public.irfq_usage_counters
  add column if not exists drawing_ai_parses integer not null default 0,
  add column if not exists match_reruns integer not null default 0;

alter table public.irfq_usage_counters enable row level security;

drop policy if exists irfq_usage_counters_own on public.irfq_usage_counters;
create policy irfq_usage_counters_own on public.irfq_usage_counters
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
