BEGIN;
SELECT plan(25);

SELECT has_table('public', 'profiles', 'profiles table exists');
SELECT has_table('public', 'user_progress', 'user progress table exists');
SELECT has_table('public', 'saved_scenarios', 'saved scenarios table exists');
SELECT has_table('public', 'research_notebooks', 'research notebooks table exists');
SELECT has_table('public', 'daily_challenges', 'daily challenges table exists');
SELECT has_table('public', 'challenge_submissions', 'verified submissions table exists');
SELECT has_table('public', 'game_session_summaries', 'compact session summaries table exists');
SELECT has_table('public', 'challenge_rate_limits', 'private rate-limit state exists');

SELECT is(
  (
    SELECT count(*)
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'profiles',
        'user_progress',
        'saved_scenarios',
        'research_notebooks',
        'daily_challenges',
        'challenge_submissions',
        'game_session_summaries',
        'challenge_rate_limits'
      )
      AND relation.relrowsecurity
  ),
  8::bigint,
  'RLS is enabled on every exposed table'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'user_progress',
        'saved_scenarios',
        'research_notebooks',
        'daily_challenges',
        'challenge_submissions',
        'game_session_summaries'
      )
  ),
  22::bigint,
  'all intended RLS policies were installed'
);

SELECT has_view('public', 'daily_challenge_catalog', 'safe challenge catalog view exists');
SELECT ok(
  (
    SELECT coalesce(relation.reloptions, '{}'::text[]) @> ARRAY['security_invoker=true']
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'daily_challenge_catalog'
  ),
  'challenge catalog uses security_invoker'
);

SELECT has_view('public', 'challenge_leaderboard', 'safe leaderboard view exists');
SELECT ok(
  (
    SELECT coalesce(relation.reloptions, '{}'::text[]) @> ARRAY['security_invoker=true']
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'challenge_leaderboard'
  ),
  'leaderboard uses security_invoker'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.challenge_submissions', 'INSERT'),
  'browser users cannot insert unverified leaderboard rows'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.challenge_submissions', 'user_id', 'SELECT'),
  'public clients cannot read submission owner ids'
);
SELECT ok(
  has_column_privilege('anon', 'public.challenge_submissions', 'score', 'SELECT'),
  'public clients can read verified scores'
);
SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.user_progress',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated anonymous and permanent users can sync progress'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.consume_challenge_submission_quota(uuid,integer,integer)',
    'EXECUTE'
  ),
  'anon role cannot consume or alter quota state'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.consume_challenge_submission_quota(uuid,integer,integer)',
    'EXECUTE'
  ),
  'authenticated browser role cannot call the quota RPC'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.consume_challenge_submission_quota(uuid,integer,integer)',
    'EXECUTE'
  ),
  'only the Edge service role can call the quota RPC'
);
SELECT ok(
  has_function_privilege(
    'anon',
    'public.get_challenge_leaderboard(uuid,integer,bigint,bigint,uuid)',
    'EXECUTE'
  ),
  'public clients can call the bounded leaderboard RPC'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.challenge_rate_limits', 'SELECT'),
  'browser roles cannot read rate-limit state'
);
SELECT ok(
  has_table_privilege(
    'service_role',
    'public.challenge_rate_limits',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'service role can maintain rate-limit state'
);
SELECT ok(
  has_column_privilege('anon', 'public.daily_challenges', 'parameters', 'SELECT'),
  'public clients can load published deterministic challenge parameters'
);

SELECT * FROM finish();
ROLLBACK;
