# Alpstead

**Farm the valley. Read the market.**

A cozy alpine farm above Lake Lucerne, where every seed is a bet and thirty days
is the whole season. Plant, water, harvest, hire, expand — into a shared market
that moves against you every time you sell into it.

Alpstead is an original game. Its engine, balance table, art and audio are all
its own.

## Run

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm lint
pnpm test
pnpm build
pnpm check:public
```

## Structure

| Path | What |
| --- | --- |
| `src/game/` | Deterministic engine and balance table |
| `src/render/` | Canvas sprite atlas and farm renderer |
| `src/village/` | 2.5D village map, movement, vehicles |
| `src/audio/` | Procedural ambient music engine |
| `src/pages/` | Routes |
| `supabase/` | Auth, profiles, leaderboard |
