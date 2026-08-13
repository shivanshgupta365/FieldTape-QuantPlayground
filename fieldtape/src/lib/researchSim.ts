/**
 * Research sandbox: actually run the engine.
 *
 * The previous version of this page drew a curve from a hand-written formula
 * (`3000 + trend + sin(day) - penalty`) and labelled it "median of seeded
 * baseline runs". The Run button only incremented a counter. Nothing simulated
 * anything, so every number on the page was decorative — worse than a crash,
 * because it looked like it worked.
 *
 * This runs real episodes of the real engine with a policy driven by the
 * scenario sliders, and reports the actual distribution of outcomes.
 *
 * Episodes are executed in small batches through a callback rather than a tight
 * loop: sixty-four thirty-day games is a few hundred thousand state transitions,
 * and doing that synchronously freezes the tab.
 */

import {
  CROP_SPECS,
  createGame,
  dispatchHumanAction,
  type CropId,
  type GameState,
} from "../game"
import { CROP_IDS } from "../game"

export interface Scenario {
  /** Days of season the plan is built for. */
  horizon: number
  /** Target number of planted tiles. */
  tiles: number
  /** Workers to hire up to. */
  workers: number
  /** Percentage of plantings given to expensive slow crops. */
  premium: number
  /** How aggressively to sell into the market: higher sells in bigger slices. */
  impact: number
}

export interface RunResult {
  /** Median bank balance at each day boundary, 0..30. */
  median: number[]
  /** 10th and 90th percentile envelopes. */
  low: number[]
  high: number[]
  terminal: { median: number; low: number; high: number }
  /** Fraction of episodes that finished ahead of the opponent. */
  winRate: number
  /** Mean number of tiles lost to drying out. */
  meanCropsLost: number
  /** Mean peak-to-trough fall in bank balance. */
  meanDrawdown: number
  episodes: number
}

/** Crops sorted cheap-and-fast first, so "premium" has a clear meaning. */
const BY_LOCKUP: CropId[] = [...CROP_IDS].sort(
  (a, b) => CROP_SPECS[a].firstYieldDay - CROP_SPECS[b].firstYieldDay,
)

/**
 * A policy the sliders actually control.
 *
 * Deliberately simple and readable: the point of the sandbox is that the player
 * can predict what a slider will do, then find out whether they were right.
 */
function scenarioAction(state: GameState, scenario: Scenario) {
  const farm = state.farms[0]
  const day = state.day

  // 1. Rescue anything about to die. Always first: a lost tile is money burned.
  const dying = farm.tiles.find(
    (t) => t.content?.kind === "crop" && !t.content.wateredToday,
  )
  if (dying) return { type: "water" as const, tileId: dying.id }

  // 2. Harvest anything ready.
  const ready = farm.tiles.find(
    (t) => t.content?.kind === "crop" && t.content.yieldUnits > 0,
  )
  if (ready) return { type: "harvest" as const, tileId: ready.id }

  // 3. Hire up to the target while there is still season left to pay it back.
  if (farm.workers < scenario.workers && day < scenario.horizon * 0.6) {
    return { type: "hire" as const }
  }

  // 4. Sell in slices sized by the impact slider.
  const holding = (Object.entries(farm.stock) as Array<[CropId, number]>)
    .filter(([, units]) => units > 0)
    .sort((a, b) => b[1] - a[1])[0]
  if (holding) {
    const [product, units] = holding
    const slice = Math.max(1, Math.round(units * (0.15 + (scenario.impact / 100) * 0.85)))
    if (units >= 3 || day >= scenario.horizon - 1) {
      return { type: "sell" as const, product, amount: Math.min(units, slice) }
    }
  }

  // 5. Plant toward the tile target, respecting the season wall: never plant a
  // crop that cannot reach its first yield before the horizon.
  const planted = farm.tiles.filter((t) => t.content?.kind === "crop").length
  if (planted < scenario.tiles) {
    const empty = farm.tiles.find((t) => !t.locked && !t.content)
    if (empty) {
      const daysLeft = scenario.horizon - day
      const viable = BY_LOCKUP.filter(
        (c) => CROP_SPECS[c].firstYieldDay <= daysLeft && CROP_SPECS[c].seedCost <= farm.money,
      )
      if (viable.length > 0) {
        // premium=0 always takes the fastest viable crop, premium=100 the slowest.
        const index = Math.min(
          viable.length - 1,
          Math.round(((scenario.premium / 100) * (viable.length - 1))),
        )
        return { type: "plant" as const, tileId: empty.id, crop: viable[index]! }
      }
    }
  }

  return { type: "wait" as const }
}

interface Episode {
  daily: number[]
  won: boolean
  cropsLost: number
  drawdown: number
}

function runEpisode(seed: string, scenario: Scenario): Episode {
  let state = createGame({ seed, playerNames: ["Scenario", "Baseline"] })
  const turnsPerDay = state.config.turnsPerDay
  const daily: number[] = [state.farms[0].money]
  let peak = state.farms[0].money
  let drawdown = 0
  let cropsLost = 0

  while (state.status === "running") {
    const before = state.farms[0].tiles.filter((t) => t.content?.kind === "crop").length
    const action = scenarioAction(state, scenario)
    state = dispatchHumanAction(state, action, 0, "balanced")
    const after = state.farms[0].tiles.filter((t) => t.content?.kind === "crop").length

    // A crop tile that disappeared without us harvesting it died.
    //
    // Counting every drop in planted tiles — which is what this did first —
    // counts successful harvests as losses, since harvesting a one-time crop
    // empties the tile. That reported ten "crops lost" a season on a plan that
    // was losing none, and made the diagnostic accuse the player of overplanting.
    if (after < before && action.type !== "harvest") cropsLost += before - after

    const money = state.farms[0].money
    peak = Math.max(peak, money)
    drawdown = Math.min(drawdown, money - peak)

    if (state.turn % turnsPerDay === 0) daily.push(money)
  }

  while (daily.length < 31) daily.push(state.farms[0].money)

  return {
    daily: daily.slice(0, 31),
    won: state.farms[0].money > state.farms[1].money,
    cropsLost,
    drawdown,
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))
  return sorted[index]!
}

/**
 * Run `count` episodes, yielding progress between batches.
 *
 * @param onProgress called with 0..1 after each batch; return false to cancel.
 */
export async function runScenario(
  scenario: Scenario,
  count: number,
  onProgress?: (fraction: number) => boolean | void,
): Promise<RunResult> {
  const episodes: Episode[] = []
  const BATCH = 4

  for (let i = 0; i < count; i += BATCH) {
    for (let k = 0; k < BATCH && i + k < count; k += 1) {
      episodes.push(runEpisode(`alpstead-research-${i + k}`, scenario))
    }
    const keepGoing = onProgress?.(Math.min(1, (i + BATCH) / count))
    if (keepGoing === false) break
    // Yield to the event loop so the progress bar can actually paint.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const days = 31
  const median: number[] = []
  const low: number[] = []
  const high: number[] = []

  for (let d = 0; d < days; d += 1) {
    const column = episodes.map((e) => e.daily[d] ?? 0).sort((a, b) => a - b)
    median.push(percentile(column, 0.5))
    low.push(percentile(column, 0.1))
    high.push(percentile(column, 0.9))
  }

  const terminals = episodes.map((e) => e.daily.at(-1) ?? 0).sort((a, b) => a - b)

  return {
    median,
    low,
    high,
    terminal: {
      median: percentile(terminals, 0.5),
      low: percentile(terminals, 0.1),
      high: percentile(terminals, 0.9),
    },
    winRate: episodes.length ? episodes.filter((e) => e.won).length / episodes.length : 0,
    meanCropsLost: episodes.length
      ? episodes.reduce((a, e) => a + e.cropsLost, 0) / episodes.length
      : 0,
    meanDrawdown: episodes.length
      ? episodes.reduce((a, e) => a + e.drawdown, 0) / episodes.length
      : 0,
    episodes: episodes.length,
  }
}
