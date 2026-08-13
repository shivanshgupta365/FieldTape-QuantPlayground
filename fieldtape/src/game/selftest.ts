import { baselineAction } from "./baseline"
import { createGame, stepGame } from "./engine"
import { marketPriceFromSupply } from "./market"
import { generateDemoReplay, validatePublicReplay } from "./replay"

export interface EngineSelfTestReport {
  passed: number
  checks: string[]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Alpstead engine self-test failed: ${message}`)
}

export function runEngineSelfTest(): EngineSelfTestReport {
  const checks: string[] = []
  const pass = (message: string): void => {
    checks.push(message)
  }

  const original = createGame({ seed: 42 })
  const next = stepGame(original, {
    0: { type: "plant", tileId: "0:0", crop: "WHEAT" },
  })
  assert(original.farms[0].tiles[0]!.content === null, "stepGame mutated its input")
  assert(next.farms[0].tiles[0]!.content?.kind === "crop", "plant did not settle")
  pass("pure transition and planting")

  assert(marketPriceFromSupply("WHEAT", 10_000) === 25, "market anchor drifted")
  assert(marketPriceFromSupply("WHEAT", 9_600) === 45, "scarcity curve drifted")
  assert(marketPriceFromSupply("MELON", 10_300) === 1, "glut floor drifted")
  pass("official public market anchors")

  let left = createGame({ seed: "determinism" })
  let right = createGame({ seed: "determinism" })
  for (let index = 0; index < 96; index += 1) {
    const leftOrders = {
      0: baselineAction(left, 0, "steady"),
      1: baselineAction(left, 1, "risk"),
    }
    const rightOrders = {
      0: baselineAction(right, 0, "steady"),
      1: baselineAction(right, 1, "risk"),
    }
    left = stepGame(left, leftOrders)
    right = stepGame(right, rightOrders)
  }
  assert(JSON.stringify(left) === JSON.stringify(right), "same seed diverged")
  pass("96-turn deterministic trajectory")

  const replay = generateDemoReplay(7)
  const validation = validatePublicReplay(replay)
  assert(validation.ok, validation.errors.join("; "))
  assert(replay.turns.length === 720, "demo replay is not a full season")
  assert(replay.terminal.status === "finished", "terminal snapshot is not finished")
  pass("720-turn public synthetic replay")

  const unsafe = { ...replay, private: { opponentPolicy: "leak" } }
  assert(!validatePublicReplay(unsafe).ok, "private payload passed publication gate")
  pass("public replay leak guard")

  return { passed: checks.length, checks }
}
