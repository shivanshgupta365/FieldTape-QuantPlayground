/**
 * Deterministic demo boards for marketing surfaces (landing hero, daily card).
 *
 * These used to be hand-faked tile arrays: a modulo pattern that produced crops
 * in positions the real engine could never generate, with growth stages
 * unrelated to any crop's actual maturity curve. That is a small lie in the
 * shop window — the hero image showed a farm that cannot exist.
 *
 * Running the real engine forward instead costs a few hundred synchronous steps
 * once, memoised by the caller, and guarantees every screenshot and hero image
 * shows a state the game can actually reach.
 */

import { baselineAction, createGame, stepGame } from "../game"
import type { BaselineStyle, PlayerId } from "../game/types"
import { canvasTilesFromState } from "../lib/gameView"
import type { CanvasTile } from "../farm3d/types"

const cache = new Map<string, CanvasTile[]>()

export function demoFarmTiles(options?: {
  seed?: string
  days?: number
  style?: BaselineStyle
  playerId?: PlayerId
}): CanvasTile[] {
  const seed = options?.seed ?? "alpstead-hero"
  const days = options?.days ?? 15
  const style = options?.style ?? "steady"
  const playerId = options?.playerId ?? 0
  const key = `${seed}:${days}:${style}:${playerId}`

  const hit = cache.get(key)
  if (hit) return hit

  let state = createGame({ seed, playerNames: ["Farm A", "Farm B"] })
  const target = days * state.config.turnsPerDay
  while (state.status === "running" && state.turn < target) {
    state = stepGame(state, {
      0: baselineAction(state, 0, style),
      1: baselineAction(state, 1, "balanced"),
    })
  }

  const tiles = canvasTilesFromState(state, playerId)
  cache.set(key, tiles)
  return tiles
}
