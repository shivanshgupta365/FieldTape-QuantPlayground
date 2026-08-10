import { baselineAction } from "./baseline"
import { createGame, stepGame } from "./engine"
import { selectPublicSnapshot } from "./selectors"
import type {
  BaselineStyle,
  GameState,
  PublicReplayV1,
  PublicReplayTurn,
} from "./types"

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "private",
  "stock",
  "shed",
  "inventory",
  "inventories",
  "seeds",
  "policy",
  "belief",
  "hidden",
  "rngState",
  "eventLog",
])

function checksumText(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function replayChecksum(replay: Omit<PublicReplayV1, "checksum" | "id">): string {
  return checksumText(JSON.stringify(replay))
}

export function generateDemoReplay(
  seed: number | string = "fieldtape-launch-match",
  players: readonly [BaselineStyle, BaselineStyle] = ["steady", "risk"],
): PublicReplayV1 {
  let state = createGame({
    seed,
    playerNames: ["Low-variance plan", "Convex harvest plan"],
  })
  const turns: PublicReplayTurn[] = []
  const checkpoints = [{ turn: 0, snapshot: selectPublicSnapshot(state) }]

  while (state.status === "running") {
    const actions = [
      baselineAction(state, 0, players[0]),
      baselineAction(state, 1, players[1]),
    ] as [ReturnType<typeof baselineAction>, ReturnType<typeof baselineAction>]
    const completedTurn = state.turn
    state = stepGame(state, { 0: actions[0], 1: actions[1] })
    turns.push({
      turn: completedTurn,
      actions: [[...actions[0]], [...actions[1]]],
      events: state.lastEvents.map((event) => ({ ...event })),
    })
    if (
      state.turn % state.config.turnsPerDay === 0 ||
      state.status === "finished"
    ) {
      checkpoints.push({ turn: state.turn, snapshot: selectPublicSnapshot(state) })
    }
  }

  const withoutIdentity: Omit<PublicReplayV1, "checksum" | "id"> = {
    kind: "fieldtape.public-replay",
    version: 1,
    engineVersion: "fieldtape-engine-v1",
    label: "Duration vs variance — synthetic public baselines",
    synthetic: true,
    seed: state.seed,
    config: { ...state.config },
    players: [
      { name: "Low-variance plan", baseline: players[0] },
      { name: "Convex harvest plan", baseline: players[1] },
    ],
    turns,
    checkpoints,
    terminal: selectPublicSnapshot(state),
  }
  const checksum = replayChecksum(withoutIdentity)
  return {
    ...withoutIdentity,
    id: `synthetic-${state.seed.toString(16)}-${checksum}`,
    checksum,
  }
}

export function replayStateAt(replay: PublicReplayV1, targetTurn: number): GameState {
  const validation = validatePublicReplay(replay)
  if (!validation.ok) throw new Error(`Invalid public replay: ${validation.errors.join("; ")}`)
  const bounded = Math.max(0, Math.min(Math.floor(targetTurn), replay.turns.length))
  let state = createGame({
    seed: replay.seed,
    config: replay.config,
    playerNames: [replay.players[0].name, replay.players[1].name],
  })
  for (let index = 0; index < bounded; index += 1) {
    const frame = replay.turns[index]!
    state = stepGame(state, { 0: frame.actions[0], 1: frame.actions[1] })
  }
  return state
}

export function serializePublicReplay(replay: PublicReplayV1, pretty = false): string {
  const validation = validatePublicReplay(replay)
  if (!validation.ok) throw new Error(`Unsafe public replay: ${validation.errors.join("; ")}`)
  return JSON.stringify(replay, null, pretty ? 2 : undefined)
}

export function parsePublicReplay(value: string): PublicReplayV1 {
  const parsed = JSON.parse(value) as unknown
  const validation = validatePublicReplay(parsed)
  if (!validation.ok) throw new Error(`Invalid public replay: ${validation.errors.join("; ")}`)
  return parsed as PublicReplayV1
}

export interface ReplayValidation {
  ok: boolean
  errors: string[]
}

export function validatePublicReplay(value: unknown): ReplayValidation {
  const errors: string[] = []
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["replay must be an object"] }
  }
  const replay = value as Partial<PublicReplayV1>
  if (replay.kind !== "fieldtape.public-replay") errors.push("unknown replay kind")
  if (replay.version !== 1) errors.push("unsupported replay version")
  if (replay.engineVersion !== "fieldtape-engine-v1") errors.push("engine mismatch")
  if (replay.synthetic !== true) errors.push("only synthetic public replays are accepted")
  if (!Number.isInteger(replay.seed)) errors.push("seed must be an integer")
  if (!Array.isArray(replay.turns)) errors.push("turns must be an array")
  if (!Array.isArray(replay.checkpoints)) errors.push("checkpoints must be an array")
  if (!replay.terminal || typeof replay.terminal !== "object") {
    errors.push("terminal snapshot is missing")
  }

  const inspect = (node: unknown, path: string): void => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      node.forEach((item, index) => inspect(item, `${path}[${index}]`))
      return
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (FORBIDDEN_PUBLIC_KEYS.has(key)) errors.push(`forbidden field ${path}.${key}`)
      inspect(child, `${path}.${key}`)
    }
  }
  inspect(value, "replay")

  if (typeof replay.checksum === "string" && replay.id && replay.config && replay.players && replay.turns && replay.checkpoints && replay.terminal) {
    const withoutIdentity: Omit<PublicReplayV1, "checksum" | "id"> = {
      kind: replay.kind as "fieldtape.public-replay",
      version: replay.version as 1,
      engineVersion: replay.engineVersion as "fieldtape-engine-v1",
      label: replay.label ?? "",
      synthetic: replay.synthetic as true,
      seed: replay.seed as number,
      config: replay.config,
      players: replay.players,
      turns: replay.turns,
      checkpoints: replay.checkpoints,
      terminal: replay.terminal,
    }
    if (replayChecksum(withoutIdentity) !== replay.checksum) errors.push("checksum mismatch")
  } else {
    errors.push("identity or checksum is missing")
  }

  return { ok: errors.length === 0, errors }
}
