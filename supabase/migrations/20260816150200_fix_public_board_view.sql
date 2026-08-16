-- Do not compose over the security-invoker internal view: that would make the
-- browser caller require the internal table privilege. This fixed definer view
-- performs the ranking itself and exposes only the six public board fields.
create or replace view public.season_leaderboard_public
with (security_invoker = false)
as
select
  rank() over (
    partition by balance_version
    order by final_money desc, created_at asc
  ) as rank,
  balance_version,
  display_name,
  final_money,
  days_completed,
  actions_used
from public.season_runs
where verified;

grant select on table public.season_leaderboard_public to anon, authenticated, service_role;
