-- Allow an anonymous player to remove the data held under their current JWT.
-- Auth identities remain provider-managed; this deletes all FieldTape records,
-- including the private contact email and any public score rows.
create or replace function public.delete_my_fieldtape_data()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'authentication required';
  end if;

  delete from public.user_progress where user_id = caller;
  delete from public.saved_scenarios where user_id = caller;
  delete from public.research_notebooks where user_id = caller;
  delete from public.game_session_summaries where user_id = caller;
  delete from public.season_runs where user_id = caller;
  delete from public.profiles where user_id = caller;
end;
$$;

revoke all on function public.delete_my_fieldtape_data() from public, anon;
grant execute on function public.delete_my_fieldtape_data() to authenticated;
