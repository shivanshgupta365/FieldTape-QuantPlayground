# FieldTape deterministic game engine

This directory contains the public-safe teaching simulation used by FieldTape.
It is a deterministic, browser-native model for playing a human against a
transparent baseline and watching synthetic baseline matches at up to full-season
speed.

It is **not** the private Kaggriculture competition agent and it is **not** a
drop-in replacement for Kaggle's interpreter. The browser game compresses unit
movement, shed pickup/drop, structure construction, and purchasing into
high-level tile orders so a learner can focus on capital allocation, duration,
turn capacity, shared-market impact, and terminal liquidation. Competition
submissions must be tested against the official Python environment.

## Core contract

```ts
import {
  baselineAction,
  createGame,
  dispatchHumanAction,
  generateDemoReplay,
  replayStateAt,
  selectMarketTape,
  stepGame,
} from "./game"

let game = createGame({ seed: "daily-2026-08-09" })

game = dispatchHumanAction(game, {
  type: "plant",
  tileId: "0:0",
  crop: "WHEAT",
})

game = stepGame(game, {
  0: [{ type: "water", tileId: "0:0" }],
  1: baselineAction(game, 1, "balanced"),
})

const replay = generateDemoReplay("launch-film")
const frame240 = replayStateAt(replay, 240)
const tape = selectMarketTape(frame240)
```

Every `stepGame` transition clones its input. Given the same seed and turn
orders, it produces byte-identical JSON state. `runGame` accelerates baseline
matches without tying simulation time to rendering time.

## Action model

- Each day has 24 turns by default.
- Each farm begins with one worker, so it can submit one tile order per turn.
- A hire is a market order and adds a worker for the rest of that day. Every
  worker can submit one tile order on subsequent turns.
- Market orders (`sell`, `hire`, `buyLand`) do not use worker slots; at most ten
  are accepted per player per turn.
- Crop watering and animal feeding are daily upkeep. Two missed days destroy
  the asset. A crop planted and left dry on planting day can fail that night.
- Sales are interleaved one unit at a time across players. Quotes therefore
  show visible slippage and shared-market impact.
- Final score is bank cash. Unsold inventory has no terminal value.

## Replay publication boundary

`PublicReplayV1` is an action log plus day checkpoints. It only accepts
`synthetic: true`. The validator recursively rejects fields named `private`,
`stock`, `shed`, `inventory`, `seeds`, `policy`, `belief`, `hidden`, `rngState`,
or `eventLog`. Public farm frames contain the visible board, bank, aggregate
estimated stock value, market supply/prices, town shops, and event markers. They
never serialize private competition-agent state.

The manifest at `/game/demo-replay-manifest.json` tells the UI which seed and
public baselines to pass to `generateDemoReplay`. Generating the replay from the
installed engine avoids checking a large, stale 720-frame artifact into the
site.

## Self-test

`runEngineSelfTest()` checks pure transitions, official market anchor examples,
same-seed determinism, a complete 720-turn synthetic season, and the replay leak
guard. It has no test-runner dependency and can also be called from Vitest.

See [ATTRIBUTION.md](./ATTRIBUTION.md) for the mechanics provenance and scope.
