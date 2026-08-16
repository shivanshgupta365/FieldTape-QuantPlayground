-- The internal board contains replay metadata used by the verifier. Public
-- clients get a deliberately narrow projection with no user identifiers,
-- seeds, timestamps, or action logs.
create view public.season_leaderboard_public
with (security_invoker = true)
as
select
  rank,
  display_name,
  final_money,
  days_completed,
  actions_used
from public.season_leaderboard;

revoke all on table public.season_leaderboard from anon, authenticated;
grant select on table public.season_leaderboard to service_role;
grant select on table public.season_leaderboard_public to anon, authenticated, service_role;

comment on view public.season_leaderboard_public is
  'The public leaderboard projection. It intentionally contains no user IDs, seeds, timestamps, or replay metadata.';
