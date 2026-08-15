-- Keep the trigger helper off the generated RPC surface even when an API role
-- has been granted EXECUTE directly by platform defaults.
revoke execute on function public.sync_season_run_display_name() from anon, authenticated;

-- One SELECT policy covers public verified rows and a signed-in player's own
-- pending rows without evaluating auth.uid() once per candidate record.
drop policy "season_runs_read_verified" on public.season_runs;
drop policy "season_runs_read_own" on public.season_runs;

create policy "season_runs_read_board_or_own"
on public.season_runs for select
to anon, authenticated
using (verified or (select auth.uid()) = user_id);

-- Both former indexes covered the same `(user_id, created_at desc)` access
-- path. Retain the named history index for player-history and rate-limit reads.
drop index public.season_runs_recent_idx;
