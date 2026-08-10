-- FieldTape persistence and verified daily-challenge leaderboard.
--
-- The browser game remains offline-first. This schema stores only compact user
-- progress, research notes, session summaries, and server-verified challenge
-- results. It deliberately does not store full replays or private agent data.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  public_id uuid not null default gen_random_uuid() unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(display_name) between 2 and 32),
  constraint profiles_display_name_format
    check (display_name ~ '^[[:alnum:]][[:alnum:] ._-]{1,31}$'),
  constraint profiles_avatar_url_https
    check (
      avatar_url is null
      or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://')
    )
);

create table public.user_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id text not null,
  mastery_score smallint not null default 0,
  lesson_state jsonb not null default '{}'::jsonb,
  best_score bigint,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id),
  constraint user_progress_module_id_format
    check (module_id ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint user_progress_mastery_range
    check (mastery_score between 0 and 100),
  constraint user_progress_lesson_state_object
    check (
      jsonb_typeof(lesson_state) = 'object'
      and pg_column_size(lesson_state) <= 16384
    )
);

create table public.saved_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  module_id text not null,
  engine_version text not null,
  scenario jsonb not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_scenarios_title_length
    check (char_length(title) between 1 and 80),
  constraint saved_scenarios_module_id_format
    check (module_id ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint saved_scenarios_engine_version_length
    check (char_length(engine_version) between 1 and 64),
  constraint saved_scenarios_payload_object
    check (
      jsonb_typeof(scenario) = 'object'
      and pg_column_size(scenario) <= 65536
    )
);

create table public.research_notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  module_id text not null,
  hypothesis text not null default '',
  analysis text not null default '',
  tags text[] not null default '{}'::text[],
  scenario_snapshot jsonb not null default '{}'::jsonb,
  result_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_notebooks_title_length
    check (char_length(title) between 1 and 100),
  constraint research_notebooks_module_id_format
    check (module_id ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint research_notebooks_hypothesis_length
    check (char_length(hypothesis) <= 2000),
  constraint research_notebooks_analysis_length
    check (char_length(analysis) <= 20000),
  constraint research_notebooks_tags_limit
    check (
      cardinality(tags) <= 12
      and pg_column_size(tags) <= 2048
    ),
  constraint research_notebooks_scenario_object
    check (
      jsonb_typeof(scenario_snapshot) = 'object'
      and pg_column_size(scenario_snapshot) <= 65536
    ),
  constraint research_notebooks_result_object
    check (
      jsonb_typeof(result_snapshot) = 'object'
      and pg_column_size(result_snapshot) <= 65536
    )
);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  slug text not null unique,
  title text not null,
  description text not null,
  engine_version text not null,
  action_schema_version smallint not null,
  seed bigint not null,
  max_actions smallint not null,
  parameters jsonb not null,
  scoring jsonb not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_challenges_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  constraint daily_challenges_title_length
    check (char_length(title) between 3 and 100),
  constraint daily_challenges_description_length
    check (char_length(description) between 10 and 1000),
  constraint daily_challenges_engine_version_length
    check (char_length(engine_version) between 1 and 64),
  constraint daily_challenges_schema_version_positive
    check (action_schema_version > 0),
  constraint daily_challenges_action_limit
    check (max_actions between 1 and 120),
  constraint daily_challenges_parameters_object
    check (
      jsonb_typeof(parameters) = 'object'
      and pg_column_size(parameters) <= 32768
    ),
  constraint daily_challenges_scoring_object
    check (
      jsonb_typeof(scoring) = 'object'
      and pg_column_size(scoring) <= 4096
    ),
  constraint daily_challenges_valid_window
    check (opens_at < closes_at)
);

create table public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  public_player_id uuid not null,
  player_display_name text not null,
  idempotency_key uuid not null,
  action_log_hash text not null,
  action_count smallint not null,
  score bigint not null,
  tie_break bigint not null,
  verifier_version text not null,
  result jsonb not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint challenge_submissions_idempotency
    unique (user_id, challenge_id, idempotency_key),
  constraint challenge_submissions_log_once
    unique (user_id, challenge_id, action_log_hash),
  constraint challenge_submissions_player_name_length
    check (char_length(player_display_name) between 2 and 32),
  constraint challenge_submissions_hash_format
    check (action_log_hash ~ '^[a-f0-9]{64}$'),
  constraint challenge_submissions_action_count
    check (action_count between 0 and 120),
  constraint challenge_submissions_verifier_version_length
    check (char_length(verifier_version) between 1 and 64),
  constraint challenge_submissions_result_object
    check (
      jsonb_typeof(result) = 'object'
      and pg_column_size(result) <= 32768
    )
);

create table public.game_session_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_key uuid not null,
  mode text not null,
  engine_version text not null,
  seed bigint not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  final_coins bigint,
  opponent_coins bigint,
  outcome text,
  turns_played smallint not null default 0,
  decision_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_session_summaries_user_session unique (user_id, session_key),
  constraint game_session_summaries_mode
    check (mode in ('play', 'watch', 'lab', 'daily', 'research')),
  constraint game_session_summaries_engine_version_length
    check (char_length(engine_version) between 1 and 64),
  constraint game_session_summaries_time_order
    check (completed_at is null or completed_at >= started_at),
  constraint game_session_summaries_outcome
    check (outcome is null or outcome in ('win', 'loss', 'tie', 'incomplete')),
  constraint game_session_summaries_turns
    check (turns_played between 0 and 720),
  constraint game_session_summaries_metrics_object
    check (
      jsonb_typeof(decision_metrics) = 'object'
      and pg_column_size(decision_metrics) <= 16384
    )
);

-- This table is intentionally unavailable to browser roles. The Edge Function
-- uses a service-role-only, security-invoker RPC for one atomic quota update.
create table public.challenge_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null,
  last_request_at timestamptz not null,
  constraint challenge_rate_limits_request_count_positive
    check (request_count > 0)
);

create index user_progress_last_opened_idx
  on public.user_progress (user_id, last_opened_at desc);
create index saved_scenarios_user_updated_idx
  on public.saved_scenarios (user_id, updated_at desc);
create index research_notebooks_user_updated_idx
  on public.research_notebooks (user_id, updated_at desc);
create index daily_challenges_published_date_idx
  on public.daily_challenges (challenge_date desc)
  where published;
create index challenge_submissions_leaderboard_idx
  on public.challenge_submissions
  (challenge_id, score desc, tie_break desc, verified_at, public_player_id);
create index challenge_submissions_user_history_idx
  on public.challenge_submissions (user_id, challenge_id, verified_at desc);
create index game_session_summaries_user_started_idx
  on public.game_session_summaries (user_id, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_progress_set_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

create trigger saved_scenarios_set_updated_at
before update on public.saved_scenarios
for each row execute function public.set_updated_at();

create trigger research_notebooks_set_updated_at
before update on public.research_notebooks
for each row execute function public.set_updated_at();

create trigger daily_challenges_set_updated_at
before update on public.daily_challenges
for each row execute function public.set_updated_at();

create trigger game_session_summaries_set_updated_at
before update on public.game_session_summaries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.saved_scenarios enable row level security;
alter table public.research_notebooks enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.game_session_summaries enable row level security;
alter table public.challenge_rate_limits enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "user_progress_select_own"
on public.user_progress for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "user_progress_insert_own"
on public.user_progress for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "user_progress_update_own"
on public.user_progress for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "user_progress_delete_own"
on public.user_progress for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "saved_scenarios_select_own"
on public.saved_scenarios for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "saved_scenarios_insert_own"
on public.saved_scenarios for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "saved_scenarios_update_own"
on public.saved_scenarios for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "saved_scenarios_delete_own"
on public.saved_scenarios for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "research_notebooks_select_own"
on public.research_notebooks for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "research_notebooks_insert_own"
on public.research_notebooks for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "research_notebooks_update_own"
on public.research_notebooks for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "research_notebooks_delete_own"
on public.research_notebooks for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "daily_challenges_read_published"
on public.daily_challenges for select
to anon, authenticated
using (published);

create policy "challenge_submissions_read_verified"
on public.challenge_submissions for select
to anon, authenticated
using (verified_at is not null);

create policy "game_session_summaries_select_own"
on public.game_session_summaries for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "game_session_summaries_insert_own"
on public.game_session_summaries for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "game_session_summaries_update_own"
on public.game_session_summaries for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "game_session_summaries_delete_own"
on public.game_session_summaries for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Explicit Data API exposure. This is separate from RLS and is required by the
-- 2026 Data API default. Browser roles receive the narrowest useful grants.
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

revoke all on table public.user_progress from anon, authenticated;
grant select, insert, update, delete on table public.user_progress to authenticated;

revoke all on table public.saved_scenarios from anon, authenticated;
grant select, insert, update, delete on table public.saved_scenarios to authenticated;

revoke all on table public.research_notebooks from anon, authenticated;
grant select, insert, update, delete on table public.research_notebooks to authenticated;

revoke all on table public.daily_challenges from anon, authenticated;
grant select (
  id,
  challenge_date,
  slug,
  title,
  description,
  engine_version,
  action_schema_version,
  seed,
  max_actions,
  parameters,
  scoring,
  opens_at,
  closes_at,
  published
) on table public.daily_challenges to anon, authenticated;

revoke all on table public.challenge_submissions from anon, authenticated;
grant select (
  id,
  challenge_id,
  public_player_id,
  player_display_name,
  action_count,
  score,
  tie_break,
  verifier_version,
  verified_at
) on table public.challenge_submissions to anon, authenticated;

revoke all on table public.game_session_summaries from anon, authenticated;
grant select, insert, update, delete on table public.game_session_summaries to authenticated;

revoke all on table public.challenge_rate_limits from anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.user_progress to service_role;
grant all on table public.saved_scenarios to service_role;
grant all on table public.research_notebooks to service_role;
grant all on table public.daily_challenges to service_role;
grant all on table public.challenge_submissions to service_role;
grant all on table public.game_session_summaries to service_role;
grant all on table public.challenge_rate_limits to service_role;

create view public.daily_challenge_catalog
with (security_invoker = true)
as
select
  id,
  challenge_date,
  slug,
  title,
  description,
  engine_version,
  action_schema_version,
  seed,
  max_actions,
  parameters,
  scoring,
  opens_at,
  closes_at,
  case
    when now() < opens_at then 'upcoming'
    when now() >= closes_at then 'closed'
    else 'open'
  end as status
from public.daily_challenges
where published;

create view public.challenge_leaderboard
with (security_invoker = true)
as
with ranked_attempts as (
  select
    id,
    challenge_id,
    public_player_id,
    player_display_name,
    action_count,
    score,
    tie_break,
    verifier_version,
    verified_at,
    row_number() over (
      partition by challenge_id, public_player_id
      order by score desc, tie_break desc, verified_at, id
    ) as attempt_order
  from public.challenge_submissions
),
best_attempts as (
  select *
  from ranked_attempts
  where attempt_order = 1
)
select
  dense_rank() over (
    partition by challenge_id
    order by score desc, tie_break desc
  ) as leaderboard_rank,
  id as submission_id,
  challenge_id,
  public_player_id,
  player_display_name,
  action_count,
  score,
  tie_break,
  verifier_version,
  verified_at
from best_attempts;

revoke all on table public.daily_challenge_catalog from anon, authenticated;
grant select on table public.daily_challenge_catalog to anon, authenticated;
grant select on table public.daily_challenge_catalog to service_role;

revoke all on table public.challenge_leaderboard from anon, authenticated;
grant select on table public.challenge_leaderboard to anon, authenticated;
grant select on table public.challenge_leaderboard to service_role;

create or replace function public.get_challenge_leaderboard(
  p_challenge_id uuid,
  p_limit integer default 50,
  p_after_score bigint default null,
  p_after_tie_break bigint default null,
  p_after_public_player_id uuid default null
)
returns table (
  leaderboard_rank bigint,
  submission_id uuid,
  challenge_id uuid,
  public_player_id uuid,
  player_display_name text,
  action_count smallint,
  score bigint,
  tie_break bigint,
  verifier_version text,
  verified_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    leaderboard.leaderboard_rank,
    leaderboard.submission_id,
    leaderboard.challenge_id,
    leaderboard.public_player_id,
    leaderboard.player_display_name,
    leaderboard.action_count,
    leaderboard.score,
    leaderboard.tie_break,
    leaderboard.verifier_version,
    leaderboard.verified_at
  from public.challenge_leaderboard as leaderboard
  where leaderboard.challenge_id = p_challenge_id
    and (
      (
        p_after_score is null
        and p_after_tie_break is null
        and p_after_public_player_id is null
      )
      or (
        p_after_score is not null
        and p_after_tie_break is not null
        and p_after_public_player_id is not null
        and (
          leaderboard.score < p_after_score
          or (
            leaderboard.score = p_after_score
            and leaderboard.tie_break < p_after_tie_break
          )
          or (
            leaderboard.score = p_after_score
            and leaderboard.tie_break = p_after_tie_break
            and leaderboard.public_player_id > p_after_public_player_id
          )
        )
      )
    )
  order by
    leaderboard.score desc,
    leaderboard.tie_break desc,
    leaderboard.public_player_id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.consume_challenge_submission_quota(
  p_user_id uuid,
  p_limit integer default 12,
  p_window_seconds integer default 900
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.challenge_rate_limits%rowtype;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 120 then
    raise exception 'p_limit must be between 1 and 120' using errcode = '22023';
  end if;

  if p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'p_window_seconds must be between 60 and 86400' using errcode = '22023';
  end if;

  insert into public.challenge_rate_limits as rate_limit (
    user_id,
    window_started_at,
    request_count,
    last_request_at
  )
  values (p_user_id, v_now, 1, v_now)
  on conflict (user_id) do update
  set
    window_started_at = case
      when rate_limit.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else rate_limit.window_started_at
    end,
    request_count = case
      when rate_limit.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit.request_count + 1
    end,
    last_request_at = v_now
  where
    rate_limit.window_started_at <= v_now - make_interval(secs => p_window_seconds)
    or rate_limit.request_count < p_limit
  returning * into v_row;

  if found then
    return query
      select true, greatest(p_limit - v_row.request_count, 0), 0;
    return;
  end if;

  select *
  into v_row
  from public.challenge_rate_limits
  where user_id = p_user_id;

  return query
    select
      false,
      0,
      greatest(
        ceil(
          extract(
            epoch from (
              v_row.window_started_at
              + make_interval(secs => p_window_seconds)
              - v_now
            )
          )
        )::integer,
        1
      );
end;
$$;

revoke all on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to authenticated, service_role;

revoke all on function public.get_challenge_leaderboard(uuid, integer, bigint, bigint, uuid) from public;
grant execute on function public.get_challenge_leaderboard(uuid, integer, bigint, bigint, uuid)
  to anon, authenticated, service_role;

revoke all on function public.consume_challenge_submission_quota(uuid, integer, integer) from public;
grant execute on function public.consume_challenge_submission_quota(uuid, integer, integer)
  to service_role;
