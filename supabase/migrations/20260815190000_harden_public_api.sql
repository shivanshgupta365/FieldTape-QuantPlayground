-- Keep the profile fan-out helper internal. It is invoked only by its trigger
-- and must never be reachable as a public Data API RPC.
create or replace function public.sync_season_run_display_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.season_runs
     set display_name = new.display_name
   where user_id = new.user_id;
  return new;
end;
$$;

revoke execute on function public.sync_season_run_display_name() from public;

-- This table is deliberately server-only. The explicit deny policy documents
-- that intent while the Data API grants remain revoked.
create policy "challenge_rate_limits_no_browser_access"
on public.challenge_rate_limits
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
