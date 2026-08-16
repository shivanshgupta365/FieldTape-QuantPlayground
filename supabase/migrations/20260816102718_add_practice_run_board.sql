create table public.practice_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  balance_version text not null check (char_length(balance_version) between 1 and 64),
  seed text not null check (char_length(seed) between 1 and 128),
  final_money bigint not null check (final_money >= 0 and final_money <= 100000000),
  days_completed smallint not null check (days_completed between 1 and 30),
  actions_used integer not null check (actions_used between 24 and 720),
  action_log jsonb not null check (jsonb_typeof(action_log) = 'array'),
  run_hash text not null unique check (run_hash ~ '^[0-9a-f]{64}$'),
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index practice_runs_board_idx on public.practice_runs (days_completed, final_money desc, created_at asc) where verified;
alter table public.practice_runs enable row level security;
revoke all on table public.practice_runs from anon, authenticated;
grant all on table public.practice_runs to service_role;

create view public.practice_leaderboard_public
with (security_invoker = false)
as
select
  rank() over (partition by balance_version, days_completed order by final_money desc, created_at asc) as rank,
  balance_version,
  display_name,
  final_money,
  days_completed,
  actions_used
from public.practice_runs
where verified;

grant select on public.practice_leaderboard_public to anon, authenticated;

create or replace function public.delete_my_fieldtape_data()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'authentication required'; end if;
  delete from public.user_progress where user_id = caller;
  delete from public.saved_scenarios where user_id = caller;
  delete from public.research_notebooks where user_id = caller;
  delete from public.game_session_summaries where user_id = caller;
  delete from public.practice_runs where user_id = caller;
  delete from public.season_runs where user_id = caller;
  delete from public.profiles where user_id = caller;
end;
$$;
