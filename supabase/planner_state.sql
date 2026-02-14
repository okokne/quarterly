create table if not exists public.planner_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  schema_version integer not null default 1
);

alter table public.planner_state enable row level security;

drop policy if exists "planner_state_select_own" on public.planner_state;
create policy "planner_state_select_own"
  on public.planner_state
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "planner_state_insert_own" on public.planner_state;
create policy "planner_state_insert_own"
  on public.planner_state
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "planner_state_update_own" on public.planner_state;
create policy "planner_state_update_own"
  on public.planner_state
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
