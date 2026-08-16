# FieldTape — QuantPlayground

**A strategy game for learning how capacity, capital, time, and markets interact.**

[Play FieldTape](https://fieldtape-quantplayground.vercel.app) · [Leaderboard](https://fieldtape-quantplayground.vercel.app/leaderboard) · [Fieldcraft](https://fieldtape-quantplayground.vercel.app/fieldcraft)

FieldTape turns a 30-day alpine farm into a small quantitative system. Every move changes the state of the field: crops need servicing, workers create capacity, sales move a shared market, and a fixed season deadline turns planning into a real trade-off. It is a deterministic teaching simulation—not financial or agricultural advice.

## Why it exists

Most farm games make scarcity feel like a lack of coins. FieldTape makes the more interesting constraint visible: **attention**. Land only pays when workers can plant, water, harvest, and sell before the season closes.

| Farm decision | Quantitative idea |
| --- | --- |
| Add plots or workers | Capacity planning and constrained optimisation |
| Buy seed or livestock | Capital allocation and opportunity cost |
| Wait for a better quote | Inventory risk and timing |
| Sell into the shared market | Supply impact and price response |
| Compare a replayed run | Reproducibility and model validation |

## Product showcase

| Strategy desk | Playable farm season |
| --- | --- |
| ![FieldTape strategy landing page](fieldtape/public/product-showcase/landing.png) | ![FieldTape 3D farm board](fieldtape/public/product-showcase/play.png) |

| Research terminal | Verified leaderboard |
| --- | --- |
| ![FieldTape research simulation graph](fieldtape/public/product-showcase/research.png) | ![FieldTape public leaderboard](fieldtape/public/product-showcase/leaderboard.png) |

| Alpine village, aerial | Alpine village, ground level |
| --- | --- |
| ![FieldTape alpine village aerial view](fieldtape/public/product-showcase/village-air.png) | ![FieldTape alpine village ground exploration](fieldtape/public/product-showcase/village-ground.png) |

| Interactive quant lab | Public-safe replay viewer |
| --- | --- |
| ![FieldTape interactive lab](fieldtape/public/product-showcase/lab.png) | ![FieldTape spectator replay](fieldtape/public/product-showcase/watch.png) |

## What you can do

- Run a real deterministic 30-day / 720-turn farm-management season.
- Plant, water, fertilize, harvest, clear weeds, raise livestock, feed and care for animals, sell stock, hire workers, and buy land.
- Delegate a day to the transparent public baseline when you want to inspect an alternate strategy.
- Post a completed season to a server-replayed public leaderboard.
- Post server-replayed practice checkpoints after any completed day—day 1, day 13, or any other day before close—and compare only against the same duration.
- Explore a persistent 3D alpine village with vehicles, discoveries, shops, a minimap, and fullscreen play.
- Use Research, interactive Labs, Learn, and Fieldcraft to connect the game loop to quantitative reasoning.

## Trust and privacy

FieldTape uses anonymous Supabase sessions for gameplay. On first entry to an interactive route, players choose a public display name and provide a private contact email.

- Only the display name is shown on public boards.
- Email is stored only on the caller-owned profile and is not part of board queries, views, or score-verification responses.
- A score is never trusted from the browser. The backend receives the action timeline, independently replays it with the deterministic engine, and persists only the reproduced result.
- The verifier accepts one player action per turn, or an exact public-baseline delegation bundle, so impossible action bundles cannot become verified scores.
- Players can delete their FieldTape profile, contact email, saved progress, and posted scores from Profile.

## Architecture

```text
fieldtape/   React + TypeScript + Vite client and deterministic game engine
supabase/    PostgreSQL migrations, RLS policies, and verify-season-run Edge Function
rules/       Public rules pack and tooling
videos/      Launch-video source material
```

The product is deployed as a static Vite app on Vercel. Supabase provides anonymous sessions, private profile storage, own-row progress persistence, safe public leaderboard projections, and JWT-protected replay verification.

## Contributing

Issues and pull requests are welcome. Preserve deterministic replay behavior and do not add private competition data, policy code, private logs, or opponent information to this public repository.

## License

FieldTape is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).
