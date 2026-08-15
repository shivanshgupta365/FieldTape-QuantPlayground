# FieldTape

**Farm the valley. Read the market.**

FieldTape is a public-safe, browser-based farming strategy game and quant-learning playground. Players have thirty days, a fixed action budget, and a shared market that reacts to every sale. The constraint is not merely cash: every planted tile needs attention, every expansion costs time, and every market decision changes the next one.

> **Live deployment:** [fieldtape-kaggriculture.vercel.app](https://fieldtape-kaggriculture.vercel.app)

## What is included

- A playable single-player farming season with a deterministic game engine.
- A 3D alpine village, farm board, market tape, research lab, daily challenges, and leaderboards.
- An offline-first experience: core play works without an account or remote service.
- Optional Supabase migrations and Edge Functions for profiles, progress, verified scores, and an in-game coach.
- A source-grounded rules pack for the Kaggriculture simulation.

## Screens and routes

| Route | Experience |
| --- | --- |
| `/` | Landing page and game overview |
| `/play` | The 30-day farming season |
| `/village` | Explore the alpine village in 3D |
| `/watch` | Watch a public-safe replay |
| `/lab` | Learn through interactive market experiments |
| `/daily` | Daily challenge surface |
| `/leaderboard` | Public ranking board |
| `/research` | Scenario and research notebook tools |

## Product showcase

| Strategy deck | Playable farming season |
| --- | --- |
| ![FieldTape landing screen](fieldtape/public/product-showcase/landing.png) | ![FieldTape farming board](fieldtape/public/product-showcase/play.png) |
| Updated 3D village — aerial | Updated 3D village — ground level |
| --- | --- |
| ![FieldTape village aerial view](fieldtape/public/product-showcase/village-air.png) | ![FieldTape village ground view](fieldtape/public/product-showcase/village-ground.png) |
| Learn — quant labs | Research terminal — 64-season graph |
| --- | --- |
| ![FieldTape quant learning lab](fieldtape/public/product-showcase/lab.png) | ![FieldTape Research tab with a 64-season outcome graph](fieldtape/public/product-showcase/research.png) |
| Public-safe spectator match | Season leaderboard |
| --- | --- |
| ![FieldTape spectator match viewer](fieldtape/public/product-showcase/watch.png) | ![FieldTape season leaderboard](fieldtape/public/product-showcase/leaderboard.png) |

## Run locally

Prerequisites: Node.js 20+ and pnpm 9+.

```bash
cd fieldtape
pnpm install
pnpm dev
```

Vite prints the local URL (normally `http://localhost:5173`).

## Verify

```bash
cd fieldtape
pnpm lint
pnpm test
pnpm build
pnpm check:public
```

## Optional Supabase backend

The game does not require Supabase for its core loop. To enable accounts, saved progress, leaderboards, daily challenge verification, and the server-side coach:

1. Create a Supabase project and link the `supabase/` directory.
2. Apply the migrations in `supabase/migrations/`.
3. Deploy the `coach` and `verify-challenge-submission` Edge Functions.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `fieldtape/.env.local` for local development, and in Vercel for production.
5. Configure the function secrets from `supabase/functions/.env.example`. Provider keys must remain server-side.

The schema uses row-level security and keeps verified score submission server-side. See [supabase/README.md](supabase/README.md) for the backend guide.

## Project structure

```text
fieldtape/  Public React + Vite game and learning experience
supabase/   Optional database migrations, policies, and Edge Functions
rules/      Extracted public rules pack and tooling
videos/     Launch-video source material
```

## Public boundary

This repository is intentionally separate from any private competition work. It contains no private policy, opponent data, private replay payloads, competition logs, or submission code. FieldTape is an unofficial educational project inspired by Kaggle's Kaggriculture simulation; Kaggle and Kaggriculture are trademarks of their respective owners.

## Deployment

The frontend is deployed on Vercel. It is a static Vite build with SPA rewrites configured in [fieldtape/vercel.json](fieldtape/vercel.json). For a full launch checklist and public-facing copy, see [LAUNCH.md](LAUNCH.md).

## License

[MIT](LICENSE)
