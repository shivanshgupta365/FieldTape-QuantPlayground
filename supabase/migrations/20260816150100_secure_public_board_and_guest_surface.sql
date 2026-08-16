-- Public reads must not expose replay metadata. This definer view is a fixed,
-- non-parameterised projection owned by the migration role; raw season rows
-- become service-only.
drop view if exists public.season_leaderboard_public;
create view public.season_leaderboard_public
with (security_invoker = false)
as
select
  rank,
  balance_version,
  display_name,
  final_money,
  days_completed,
  actions_used
from public.season_leaderboard;

revoke all on table public.season_runs from anon, authenticated;
revoke all on table public.season_personal_best from anon, authenticated;
grant select on table public.season_leaderboard_public to anon, authenticated, service_role;

-- Keep profile totals useful without reopening raw season rows to browsers.
create or replace function public.get_my_field_notes()
returns table (
  display_name text,
  labs_complete integer,
  seasons_played integer,
  notebooks_count integer
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select p.display_name from public.profiles p where p.user_id = auth.uid()), 'Field researcher'),
    (select count(*)::integer from public.user_progress u where u.user_id = auth.uid()),
    (select count(*)::integer from public.season_runs s where s.user_id = auth.uid()),
    (select count(*)::integer from public.research_notebooks n where n.user_id = auth.uid())
  where auth.uid() is not null;
$$;

revoke all on function public.get_my_field_notes() from public;
grant execute on function public.get_my_field_notes() to authenticated, service_role;

-- These persisted tables are not used by the anonymous FieldTape flow.
drop policy if exists "saved_scenarios_select_own" on public.saved_scenarios;
drop policy if exists "saved_scenarios_insert_own" on public.saved_scenarios;
drop policy if exists "saved_scenarios_update_own" on public.saved_scenarios;
drop policy if exists "saved_scenarios_delete_own" on public.saved_scenarios;
drop policy if exists "game_session_summaries_select_own" on public.game_session_summaries;
drop policy if exists "game_session_summaries_insert_own" on public.game_session_summaries;
drop policy if exists "game_session_summaries_update_own" on public.game_session_summaries;
drop policy if exists "game_session_summaries_delete_own" on public.game_session_summaries;
revoke all on table public.saved_scenarios, public.game_session_summaries from authenticated;
