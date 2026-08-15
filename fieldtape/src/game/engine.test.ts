// @vitest-environment node

import { describe, expect, it } from "vitest"

import { MARKET_CURVES } from "./constants"
import {
  baselineAction,
  createGame,
  generateDemoReplay,
  marketPriceFromSupply,
  replayStateAt,
  stepGame,
  validatePublicReplay,
} from "./index"

describe("Alpstead deterministic engine", () => {
  it("keeps transitions pure and enforces the worker ceiling", () => {
    const initial = createGame({ seed: 11 })
    const next = stepGame(initial, {
      0: [
        { type: "plant", tileId: "0:0", crop: "WHEAT" },
        { type: "plant", tileId: "1:0", crop: "WHEAT" },
      ],
    })

    expect(initial.farms[0].tiles[0]!.content).toBeNull()
    expect(next.farms[0].tiles[0]!.content?.kind).toBe("crop")
    expect(next.farms[0].tiles[1]!.content).toBeNull()
    expect(next.lastEvents.some((event) => event.title === "Action ceiling reached")).toBe(true)
  })

  /**
   * Properties of our own price curve, not fixed anchors from an outside table.
   *
   * This test used to assert specific numbers copied from a third-party
   * environment, which coupled the public game to that source. Asserting the
   * curve's shape is both licence-clean and a stronger test: it keeps holding
   * when the balance table is retuned, which is the whole point of owning it.
   */
  it("prices at base when supply sits at equilibrium", () => {
    for (const product of ["WHEAT", "CARROT", "MELON"] as const) {
      expect(marketPriceFromSupply(product, MARKET_CURVES[product].equilibrium)).toBe(
        MARKET_CURVES[product].base,
      )
    }
  })

  it("raises price on scarcity and lowers it on glut", () => {
    for (const product of ["WHEAT", "CARROT", "MELON"] as const) {
      const eq = MARKET_CURVES[product].equilibrium
      const base = MARKET_CURVES[product].base
      expect(marketPriceFromSupply(product, eq - 400)).toBeGreaterThan(base)
      expect(marketPriceFromSupply(product, eq + 400)).toBeLessThan(base)
    }
  })

  it("never prices below the floor, however large the glut", () => {
    for (const product of ["WHEAT", "MELON", "WOOL"] as const) {
      const eq = MARKET_CURVES[product].equilibrium
      expect(marketPriceFromSupply(product, eq + 500_000)).toBeGreaterThanOrEqual(1)
    }
  })

  it("moves monotonically as supply grows", () => {
    const eq = MARKET_CURVES.WHEAT.equilibrium
    let previous = Number.POSITIVE_INFINITY
    for (let supply = eq - 800; supply <= eq + 800; supply += 200) {
      const price = marketPriceFromSupply("WHEAT", supply)
      expect(price).toBeLessThanOrEqual(previous)
      previous = price
    }
  })

  it("repeats a trajectory byte for byte from the same seed", () => {
    let left = createGame({ seed: "paired-seed" })
    let right = createGame({ seed: "paired-seed" })
    for (let turn = 0; turn < 120; turn += 1) {
      left = stepGame(left, {
        0: baselineAction(left, 0, "steady"),
        1: baselineAction(left, 1, "risk"),
      })
      right = stepGame(right, {
        0: baselineAction(right, 0, "steady"),
        1: baselineAction(right, 1, "risk"),
      })
    }
    expect(right).toEqual(left)
  })

  it("replays a completed normalized player action timeline", () => {
    let played = createGame({ seed: "verified-season" })
    const actionLog = [] as ReturnType<typeof baselineAction>[]
    while (played.status === "running") {
      const playerActions = baselineAction(played, 0, "steady")
      actionLog.push(playerActions)
      played = stepGame(played, {
        0: playerActions,
        1: baselineAction(played, 1, "balanced"),
      })
    }

    let replayed = createGame({ seed: "verified-season" })
    for (const playerActions of actionLog) {
      replayed = stepGame(replayed, {
        0: playerActions,
        1: baselineAction(replayed, 1, "balanced"),
      })
    }

    expect(actionLog).toHaveLength(720)
    expect(replayed).toEqual(played)
  })

  it("builds and reconstructs a safe, complete public replay", () => {
    const replay = generateDemoReplay(7)
    expect(validatePublicReplay(replay)).toEqual({ ok: true, errors: [] })
    expect(replay.turns).toHaveLength(720)
    expect(replay.checkpoints).toHaveLength(31)

    const terminal = replayStateAt(replay, 720)
    expect(terminal.status).toBe("finished")
    expect(terminal.farms.map((farm) => farm.money)).toEqual(
      replay.terminal.farms.map((farm) => farm.money),
    )

    expect(validatePublicReplay({ ...replay, private: { policy: "leak" } }).ok).toBe(false)
  })
})
