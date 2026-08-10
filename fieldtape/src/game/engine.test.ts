// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  baselineAction,
  createGame,
  generateDemoReplay,
  marketPriceFromSupply,
  replayStateAt,
  stepGame,
  validatePublicReplay,
} from "./index"

describe("FieldTape deterministic engine", () => {
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

  it("matches published market anchor examples", () => {
    expect(marketPriceFromSupply("WHEAT", 10_000)).toBe(25)
    expect(marketPriceFromSupply("WHEAT", 9_600)).toBe(45)
    expect(marketPriceFromSupply("CARROT", 10_450)).toBe(10)
    expect(marketPriceFromSupply("MELON", 10_300)).toBe(1)
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
