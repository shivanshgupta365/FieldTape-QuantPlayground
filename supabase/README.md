# FieldTape Supabase backend

This directory is the optional sync and verified-leaderboard layer for FieldTape. The game must stay fully playable without it: simulations, replays, labs, and drafts live locally first. Supabase stores compact account data and independently replays daily-challenge action logs before publishing scores.

The backend never imports the private Kaggriculture competition agent and never stores private policies, opponent datasets, or full competition replays.

## Data model and access

| Surface | Browser access | Notes |
| --- | --- | --- |
| `profiles` | Own row, signed-in users | Anonymous users may create a temporary profile; only permanent users can publish scores. |
| `user_progress` | Own rows, full CRUD | Small JSON lesson state, capped at 16 KiB. |
| `saved_scenarios` | Own rows, full CRUD | Parameter snapshots capped at 64 KiB. |
| `research_notebooks` | Own rows, full CRUD | Hypothesis, analysis, tags, and compact snapshots. |
| `game_session_summaries` | Own rows, full CRUD | Summary metrics only; no frame-by-frame replay storage. |
| `daily_challenges` | Published rows, read-only | Deterministic seed, engine contract, parameters, and scoring. |
| `challenge_submissions` | Verified public columns, read-only | Owner UUID, action hash, idempotency key, and private verifier fields are not granted to browser roles. |
| `challenge_rate_limits` | No browser access | Updated atomically by a service-role-only RPC. |

Every `public` table has RLS enabled. Ownership policies use `(select auth.uid())`, UPDATE policies include both `USING` and `WITH CHECK`, public views use `security_invoker`, and Data API grants are explicit. `authenticated` includes Supabase anonymous users, so leaderboard publication is enforced in the authenticated Edge Function by the signed `is_anonymous` JWT claim. There is no client INSERT grant or policy on `challenge_submissions`.

## Local setup

The project is pinned to Supabase CLI `2.113.0`, Deno `2.9.5`, `@supabase/server` `1.4.1`, and Supabase Functions JS `2.112.2`.

1. Start Docker Desktop (or another Docker-compatible runtime).
2. From the repository root, start and reset the local stack:

   ```bash
   npx --yes supabase@2.113.0 start
   npx --yes supabase@2.113.0 db reset
   ```

3. Run schema/RLS tests and the deterministic replay tests:

   ```bash
   npx --yes supabase@2.113.0 test db supabase/tests --local
   npx --yes deno@2.9.5 test \
     --config supabase/functions/verify-challenge-submission/deno.json \
     supabase/functions/_shared/challenge_engine_test.ts
   npx --yes deno@2.9.5 check \
     --config supabase/functions/verify-challenge-submission/deno.json \
     supabase/functions/verify-challenge-submission/index.ts
   ```

4. Serve the verifier:

   ```bash
   npx --yes supabase@2.113.0 functions serve verify-challenge-submission
   ```

The local configuration enables anonymous sign-ins and manual identity linking. Before public launch, enable Turnstile or hCaptcha for anonymous sign-in abuse prevention and configure the production Vercel URLs in Auth redirect allow-lists. Supabase does not automatically clean up abandoned anonymous users; schedule a reviewed cleanup policy appropriate to the product before long-term operation.

## Frontend environment

Only the project URL and publishable key belong in Vercel/Vite:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Do not create any `VITE_`, `NEXT_PUBLIC_`, or browser variable containing a Supabase secret/service key. Hosted Edge Functions receive `SUPABASE_URL`, publishable keys, secret keys, and JWKS automatically. The checked-in `functions/.env.example` intentionally contains no values.

The frontend should treat missing variables, network errors, and a paused free project as sync-unavailable states. Keep the local IndexedDB record authoritative, queue compact mutations, and merge by `updated_at` when sync returns. Game start, lab execution, replay playback, and notebook editing must never wait for Supabase.

## Verification contract

`verify-challenge-submission` accepts only a valid permanent-user JWT and this JSON shape:

```json
{
  "challengeId": "84010000-0000-4000-8000-000000000001",
  "idempotencyKey": "c7727463-9cce-4dd0-8bda-a80f480a1208",
  "actions": [
    {
      "period": 0,
      "orders": [
        { "crop": "wheat", "units": 8 },
        { "crop": "carrot", "units": 4 }
      ]
    },
    {
      "period": 2,
      "orders": [{ "crop": "wheat", "units": 6 }]
    }
  ]
}
```

Contract v1 uses integer fixed-point arithmetic:

- Purchase cost is crop cost plus a transaction fee in basis points.
- Lots settle after their crop-specific maturity delay.
- Payout shocks are generated from the published seed, crop, purchase period, and maturity period.
- Larger lots incur deterministic market impact.
- Lots maturing exactly at the season boundary settle; later lots expire at zero.
- Primary score is final cash. The tie break is negative maximum drawdown, so a smaller drawdown ranks higher.

The function strictly validates fields and sizes, canonicalizes the normalized log, hashes it with SHA-256, replays it, and stores only the hash and compact diagnostics. Identical retries return the original receipt. Reusing an idempotency key for different actions returns `409`. Verification is limited to 12 new attempts per 15-minute user window; idempotent retries do not consume quota.

`get_challenge_leaderboard` caps each page at 100 rows. For the next page, pass all three values from the last row: `p_after_score`, `p_after_tie_break`, and `p_after_public_player_id`. Pass none of them for the first page; partial cursors intentionally return no rows.

## Deploy

Create a free Supabase project, then authenticate and discover commands with the pinned CLI:

```bash
npx --yes supabase@2.113.0 login
npx --yes supabase@2.113.0 projects list
npx --yes supabase@2.113.0 link --project-ref PROJECT_REF
npx --yes supabase@2.113.0 db push
npx --yes supabase@2.113.0 functions deploy verify-challenge-submission --use-api
```

Apply `seed.sql` only when those launch challenges are desired:

```bash
npx --yes supabase@2.113.0 seed --linked
```

After deployment:

1. Enable anonymous Auth and identity linking in the dashboard.
2. Configure CAPTCHA and Vercel redirect URLs.
3. Run database advisors and resolve security/performance findings.
4. Invoke the function with a permanent-user access token; verify anonymous users receive `403`.
5. Query `daily_challenge_catalog` and `get_challenge_leaderboard` with a publishable key.
6. Confirm the browser cannot insert `challenge_submissions` or read `challenge_rate_limits`.

No deployment is considered complete until the public Data API reads, authenticated sync, verifier, idempotent retry, anonymous rejection, rate limit, and leaderboard query have each been probed against the final hosted project.
