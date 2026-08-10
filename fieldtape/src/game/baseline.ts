import { ANIMAL_SPECS, CROP_SPECS, PRODUCT_IDS, hireCost } from "./constants"
import { isHarvestable, stepGame } from "./engine"
import type {
  BaselineStyle,
  CropId,
  FarmState,
  FarmTile,
  GameAction,
  GameState,
  PlayerId,
  ProductId,
  RunGameOptions,
} from "./types"

function occupiedTiles(farm: FarmState): FarmTile[] {
  return farm.tiles.filter((tile) => !tile.locked && tile.content !== null)
}

function emptyTiles(farm: FarmState): FarmTile[] {
  return farm.tiles.filter((tile) => !tile.locked && tile.content === null)
}

function chooseCrop(state: GameState, farm: FarmState, style: BaselineStyle): CropId {
  const daysRemaining = state.config.days - state.day
  const affordable = (crop: CropId) => CROP_SPECS[crop].seedCost <= farm.money

  if (daysRemaining <= 3) return affordable("WHEAT") ? "WHEAT" : "CARROT"
  if (daysRemaining <= 6) return affordable("CARROT") ? "CARROT" : "WHEAT"

  if (style === "risk") {
    if (daysRemaining > 12 && affordable("MELON")) return "MELON"
    if (daysRemaining > 10 && affordable("STRAWBERRY")) return "STRAWBERRY"
  }
  if (style === "growth") {
    if (daysRemaining > 13 && affordable("STRAWBERRY")) return "STRAWBERRY"
    if (daysRemaining > 10 && affordable("TOMATO")) return "TOMATO"
  }
  if (style === "steady") {
    return affordable("CARROT") ? "CARROT" : "WHEAT"
  }

  const rotation: CropId[] = ["MELON", "TOMATO", "CARROT", "WHEAT"]
  const offset = (state.day + farm.playerId) % rotation.length
  for (let index = 0; index < rotation.length; index += 1) {
    const crop = rotation[(index + offset) % rotation.length]!
    if (CROP_SPECS[crop].firstYieldDay < daysRemaining && affordable(crop)) return crop
  }
  return "WHEAT"
}

function sellThreshold(style: BaselineStyle, product: ProductId): number {
  if (style === "steady") return 2
  if (style === "risk") return product === "MELON" || product === "WOOL" ? 6 : 4
  return 3
}

function marketOrders(
  state: GameState,
  playerId: PlayerId,
  style: BaselineStyle,
): GameAction[] {
  const farm = state.farms[playerId]
  const orders: GameAction[] = []
  const daysRemaining = state.config.days - state.day

  for (const product of PRODUCT_IDS) {
    const units = farm.stock[product]
    const terminal = daysRemaining <= 2
    const quote = state.market.prices[product]
    const healthyQuote = quote >= 0.8 * state.market.previousPrices[product]
    if (units > 0 && (terminal || (units >= sellThreshold(style, product) && healthyQuote))) {
      orders.push({ type: "sell", product, amount: units })
    }
  }

  const occupied = occupiedTiles(farm).length
  const desiredWorkers = Math.min(4, Math.max(1, Math.ceil((occupied + 5) / 9)))
  if (
    state.day < state.config.days - 3 &&
    farm.workers < desiredWorkers &&
    farm.money >= hireCost(farm.hiresToday)
  ) {
    orders.push({ type: "hire" })
  }

  const unlocked = farm.tiles.filter((tile) => !tile.locked).length
  const nextLandCost = [1_000, 2_000, 4_000][farm.unlockedQuadrants.length - 1]
  if (
    state.day < 19 &&
    farm.unlockedQuadrants.length < 4 &&
    occupied >= unlocked * 0.72 &&
    farm.money >= (nextLandCost ?? Number.POSITIVE_INFINITY)
  ) {
    orders.push({ type: "buyLand" })
  }

  return orders.slice(0, state.config.maxMarketOrdersPerTurn)
}

/**
 * A transparent public baseline. It is intentionally small and inspectable;
 * FieldTape never imports the private competition agent or its parameters.
 */
export function baselineAction(
  state: GameState,
  playerId: PlayerId,
  style: BaselineStyle = "balanced",
): GameAction[] {
  if (state.status === "finished") return [{ type: "wait" }]
  const farm = state.farms[playerId]
  const workerOrders: GameAction[] = []
  const used = new Set<string>()

  const schedule = (action: GameAction, key?: string): boolean => {
    if (workerOrders.length >= farm.workers) return false
    if (key && used.has(key)) return false
    workerOrders.push(action)
    if (key) used.add(key)
    return true
  }

  // Preserve live assets first: this makes the action-budget constraint visible.
  for (const tile of farm.tiles) {
    if (tile.content?.kind === "crop" && !tile.content.wateredToday) {
      schedule({ type: "water", tileId: tile.id }, tile.id)
    }
  }
  for (const tile of farm.tiles) {
    if (tile.content?.kind === "animal" && !tile.content.fedToday) {
      schedule({ type: "feed", tileId: tile.id }, tile.id)
    }
  }

  // Then realize cash flows.
  for (const tile of farm.tiles) {
    if (tile.content && isHarvestable(state, tile.content)) {
      schedule({ type: "harvest", tileId: tile.id }, tile.id)
    }
  }

  if (style === "growth") {
    for (const tile of farm.tiles) {
      if (tile.content?.kind === "animal" && tile.content.fedToday) {
        schedule({ type: "care", tileId: tile.id }, tile.id)
      }
    }
  }

  for (const tile of farm.tiles) {
    if (tile.content?.kind === "weed") schedule({ type: "clear", tileId: tile.id }, tile.id)
  }

  // Acquire an occasional recurring asset. Other styles stay crop-led so the
  // demo exposes meaningfully different duration and variance profiles.
  const hasAnimal = farm.tiles.some((tile) => tile.content?.kind === "animal")
  if (
    (style === "growth" || style === "risk") &&
    !hasAnimal &&
    state.day < 10 &&
    farm.money >= ANIMAL_SPECS.GOOSE.cost + 500
  ) {
    const target = emptyTiles(farm)[0]
    if (target) schedule({ type: "placeAnimal", tileId: target.id, animal: "GOOSE" }, target.id)
  }

  const occupied = occupiedTiles(farm).length
  const targetOccupancy = Math.min(
    farm.tiles.filter((tile) => !tile.locked).length,
    Math.max(6, farm.workers * (style === "steady" ? 7 : 9)),
  )
  if (occupied < targetOccupancy && state.day < state.config.days - 2) {
    const crop = chooseCrop(state, farm, style)
    for (const target of emptyTiles(farm)) {
      if (farm.money < CROP_SPECS[crop].seedCost) break
      if (!schedule({ type: "plant", tileId: target.id, crop }, target.id)) break
    }
  }

  if (workerOrders.length === 0) workerOrders.push({ type: "wait" })
  return [...workerOrders, ...marketOrders(state, playerId, style)]
}

export function dispatchHumanAction(
  state: GameState,
  action: GameAction | readonly GameAction[],
  playerId: PlayerId = 0,
  opponentStyle: BaselineStyle = "balanced",
): GameState {
  const opponent = playerId === 0 ? 1 : 0
  return stepGame(state, {
    [playerId]: Array.isArray(action) ? action : [action as GameAction],
    [opponent]: baselineAction(state, opponent, opponentStyle),
  })
}

export function runGame(state: GameState, options: RunGameOptions = {}): GameState {
  const styles = options.players ?? ["balanced", "growth"]
  const total = state.config.days * state.config.turnsPerDay
  const limit = Math.min(options.maxTurns ?? total, total)
  let current = state
  while (current.status === "running" && current.turn < limit) {
    current = stepGame(current, {
      0: baselineAction(current, 0, styles[0]),
      1: baselineAction(current, 1, styles[1]),
    })
    options.onStep?.(current)
  }
  return current
}
