-- Alpstead season leaderboard.
--
-- The existing challenge_submissions table covers short daily challenges. This
-- adds full 30-day season runs, which is what the game is actually scored on.
--
-- Sized for real traffic, not a demo: the ranking view is index-backed, results
-- are keyed by balance version so a retune never mixes incomparable scores into
-- one board, and the read path is public so a leaderboard renders for signed-out
-- visitors.

create table public.season_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Denormalised so the board renders in one query without joining profiles.
  -- Kept in sync by a trigger below; profiles remains the source of truth.
  display_name text not null,

  -- Scores are only comparable inside one balance version. Mixing them would
  -- silently rank a player who played an easier table above one who did not.
  balance_version text not null,

  seed text not null,
  final_money bigint not null,
  days_completed smallint not null,
  actions_used integer not null,

  -- Ordered action log, replayed server-side to verify the score.
  action_log jsonb not null,
  -- BLAKE2/SHA hex over (seed, balance_version, action_log). Idempotency key.
  run_hash text not null,

  verified boolean not null default false,
  verifier_version text,
  verified_at timestamptz,

  created_at timestamptz not null default now(),

  constraint season_runs_money_range
    check (final_money >= 0 and final_money <= 100000000),
  constraint season_runs_days_range
    check (days_completed between 0 and 365),
  constraint season_runs_actions_range
    check (actions_used between 0 and 200000),
  constraint season_runs_hash_format
    check (run_hash ~ '^[0-9a-f]{64}$'),
  constraint season_runs_seed_length
    check (char_length(seed) between 1 and 128),
  constraint season_runs_balance_version_length
    check (char_length(balance_version) between 1 and 64),
  constraint season_runs_display_name_length
    check (char_length(display_name) between 2 and 32),
  constraint season_runs_log_is_array
    check (jsonb_typeof(action_log) = 'array'),
  -- One row per identical run. Resubmitting the same log is a no-op, so a
  -- flaky network cannot inflate the board.
  constraint season_runs_unique_hash unique (run_hash)
);

-- The board's only hot query: verified runs for one balance version, best first.
create index season_runs_board_idx
  on public.season_runs (balance_version, final_money desc, created_at asc)
  where verified;

-- "My runs", newest first.
create index season_runs_user_idx
  on public.season_runs (user_id, created_at desc);

-- Rate limiting reads this to count recent submissions per user.
create index season_runs_recent_idx
  on public.season_runs (user_id, created_at desc);

alter table public.season_runs enable row level security;

-- Anyone may read verified runs. This is what makes the board work logged out.
create policy "season_runs_read_verified"
on public.season_runs for select
to anon, authenticated
using (verified);

-- A signed-in player may always read their own rows, verified or not, so they
-- can see a pending submission.
create policy "season_runs_read_own"
on public.season_runs for select
to authenticated
using (auth.uid() = user_id);

-- Inserts go through the edge function under the service role. Clients cannot
-- write directly: a client-writable score table is not a leaderboard.
revoke all on table public.season_runs from anon, authenticated;
grant select on table public.season_runs to anon, authenticated;
grant all on table public.season_runs to service_role;

-- Keep the denormalised name aligned with the profile it came from.
create or replace function public.sync_season_run_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.season_runs
     set display_name = new.display_name
   where user_id = new.user_id;
  return new;
end;
$$;

create trigger profiles_display_name_fanout
after update of display_name on public.profiles
for each row
when (old.display_name is distinct from new.display_name)
execute function public.sync_season_run_display_name();

-- Ranked board. rank() not row_number(): ties should share a rank, and with
-- integer coin totals ties are common.
create view public.season_leaderboard
with (security_invoker = true)
as
select
  rank() over (
    partition by balance_version
    order by final_money desc, created_at asc
  ) as rank,
  id,
  user_id,
  display_name,
  balance_version,
  seed,
  final_money,
  days_completed,
  actions_used,
  verified_at,
  created_at
from public.season_runs
where verified;

grant select on table public.season_leaderboard to anon, authenticated;
grant select on table public.season_leaderboard to service_role;

-- Personal best per player, for "you are #N" without scanning the whole board.
create view public.season_personal_best
with (security_invoker = true)
as
select distinct on (user_id, balance_version)
  user_id,
  display_name,
  balance_version,
  final_money,
  days_completed,
  created_at
from public.season_runs
where verified
order by user_id, balance_version, final_money desc, created_at asc;

grant select on table public.season_personal_best to anon, authenticated;
grant select on table public.season_personal_best to service_role;

comment on table public.season_runs is
  'Full-season results. Written only by the verify-season-run edge function.';
comment on view public.season_leaderboard is
  'Public ranked board, partitioned by balance_version.';
