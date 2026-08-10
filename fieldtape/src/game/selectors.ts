import { ANIMAL_SPECS, CROP_SPECS, PRODUCT_IDS } from "./constants"
import { isHarvestable } from "./engine"
import { productMarkToMarket } from "./market"
import type {
  ClockView,
  FarmMetrics,
  FarmTile,
  GameState,
  MarketTapeRow,
  PlayerId,
  PublicFarmFrame,
  PublicFarmTile,
  PublicGameSnapshot,
  ReplayEvent,
  ScoreboardRow,
} from "./types"

export function selectClock(state: GameState): ClockView {
  const total = state.config.days * state.config.turnsPerDay
  return {
    turn: state.turn,
    totalTurns: total,
    day: state.day,
    displayDay: Math.min(state.config.days, state.day + 1),
    totalDays: state.config.days,
    hour: state.hour,
    actionsLeftToday:
      state.hour === 0 && state.turn > 0
        ? state.config.turnsPerDay
        : state.config.turnsPerDay - state.hour,
    progress: Math.min(1, state.turn / total),
  }
}

export function selectMarketTape(state: GameState): MarketTapeRow[] {
  return PRODUCT_IDS.map((product) => {
    const price = state.market.prices[product]
    const previous = state.market.previousPrices[product]
    const change = price - previous
    return {
      product,
      price,
      change,
      changePct: previous === 0 ? 0 : change / previous,
      supply: state.market.supply[product],
    }
  })
}

export function selectScoreboard(state: GameState): [ScoreboardRow, ScoreboardRow] {
  const values = state.farms.map((farm) => {
    const estimatedStockValue = productMarkToMarket(farm.stock, state.market.prices)
    return {
      playerId: farm.playerId,
      name: farm.name,
      money: farm.money,
      estimatedStockValue,
      markToMarket: farm.money + estimatedStockValue,
    }
  }) as [
    Omit<ScoreboardRow, "lead" | "rank">,
    Omit<ScoreboardRow, "lead" | "rank">,
  ]
  const leader = values[0].money >= values[1].money ? values[0] : values[1]
  return values.map((row) => ({
    ...row,
    lead: row.money - values[row.playerId === 0 ? 1 : 0].money,
    rank: (row.playerId === leader.playerId ? 1 : 2) as 1 | 2,
  })) as [ScoreboardRow, ScoreboardRow]
}

export function selectFarmMetrics(state: GameState, playerId: PlayerId): FarmMetrics {
  const farm = state.farms[playerId]
  const unlocked = farm.tiles.filter((tile) => !tile.locked)
  const contents = unlocked.filter((tile) => tile.content)
  const cropTiles = contents.filter((tile) => tile.content?.kind === "crop")
  const animalTiles = contents.filter((tile) => tile.content?.kind === "animal")
  const dryRiskTiles = contents.filter((tile) => {
    if (tile.content?.kind === "crop") {
      return !tile.content.wateredToday && tile.content.consecutiveDryDays >= 1
    }
    if (tile.content?.kind === "animal") {
      return !tile.content.fedToday && tile.content.consecutiveHungryDays >= 1
    }
    return false
  })
  return {
    playerId,
    actionCapacityToday: farm.workers * state.config.turnsPerDay,
    actionsRemainingThisTurn: farm.workers,
    occupiedTiles: contents.length,
    cropTiles: cropTiles.length,
    animalTiles: animalTiles.length,
    dryRiskTiles: dryRiskTiles.length,
    harvestableTiles: contents.filter(
      (tile) => tile.content && isHarvestable(state, tile.content),
    ).length,
    unlockedTiles: unlocked.length,
    stockUnits: PRODUCT_IDS.reduce((sum, product) => sum + farm.stock[product], 0),
    discardedUnits: farm.discardedUnits,
  }
}

function publicTile(state: GameState, tile: FarmTile): PublicFarmTile {
  const base = {
    id: tile.id,
    x: tile.x,
    y: tile.y,
    quadrant: tile.quadrant,
    locked: tile.locked,
  }
  if (!tile.content) return { ...base, content: null }
  if (tile.content.kind === "weed") {
    return { ...base, content: { kind: "weed" } }
  }
  if (tile.content.kind === "crop") {
    const ageDays = state.day - tile.content.plantedDay
    return {
      ...base,
      content: {
        kind: "crop",
        crop: tile.content.crop,
        ageDays,
        wateredToday: tile.content.wateredToday,
        ready:
          tile.content.yieldUnits > 0 &&
          ageDays >= CROP_SPECS[tile.content.crop].firstYieldDay,
      },
    }
  }
  const ageDays = state.day - tile.content.placedDay
  return {
    ...base,
    content: {
      kind: "animal",
      animal: tile.content.animal,
      ageDays,
      fedToday: tile.content.fedToday,
      ready: tile.content.yieldUnits > 0,
    },
  }
}

export function selectPublicFarm(state: GameState, playerId: PlayerId): PublicFarmFrame {
  const farm = state.farms[playerId]
  const tiles = farm.tiles.map((tile) => publicTile(state, tile))
  return {
    playerId,
    name: farm.name,
    money: farm.money,
    workers: farm.workers,
    unlockedQuadrants: [...farm.unlockedQuadrants],
    plantedTiles: tiles.filter(
      (tile) => tile.content?.kind === "crop" || tile.content?.kind === "animal",
    ).length,
    readyTiles: tiles.filter(
      (tile) => tile.content?.kind === "crop" || tile.content?.kind === "animal",
    ).filter((tile) => tile.content && "ready" in tile.content && tile.content.ready).length,
    estimatedStockValue: productMarkToMarket(farm.stock, state.market.prices),
    tiles,
  }
}

export function selectPublicSnapshot(state: GameState): PublicGameSnapshot {
  return {
    turn: state.turn,
    day: state.day,
    hour: state.hour,
    status: state.status,
    farms: [selectPublicFarm(state, 0), selectPublicFarm(state, 1)],
    marketPrices: { ...state.market.prices },
    marketSupply: { ...state.market.supply },
    unlockedShops: [...state.town.unlockedShops],
  }
}

export function selectTileGrid(state: GameState, playerId: PlayerId): PublicFarmTile[] {
  return selectPublicFarm(state, playerId).tiles
}

export function selectEventMarkers(
  state: GameState,
  minimumImportance: 1 | 2 | 3 = 2,
): ReplayEvent[] {
  return state.eventLog
    .filter((event) => event.importance >= minimumImportance)
    .sort((left, right) => left.turn - right.turn || left.id.localeCompare(right.id))
}

export function selectAssetPayoff(state: GameState, tile: FarmTile): {
  ageDays: number
  nextCashFlowInDays: number | null
  potentialUnits: number
  currentUnitPrice: number
} | null {
  if (!tile.content || tile.content.kind === "weed") return null
  if (tile.content.kind === "crop") {
    const age = state.day - tile.content.plantedDay
    const spec = CROP_SPECS[tile.content.crop]
    return {
      ageDays: age,
      nextCashFlowInDays: Math.max(0, spec.firstYieldDay - age),
      potentialUnits: tile.content.yieldUnits,
      currentUnitPrice: state.market.prices[tile.content.crop],
    }
  }
  const age = state.day - tile.content.placedDay
  const spec = ANIMAL_SPECS[tile.content.animal]
  return {
    ageDays: age,
    nextCashFlowInDays: Math.max(0, spec.firstYieldDay - age),
    potentialUnits: tile.content.yieldUnits,
    currentUnitPrice: state.market.prices[spec.product],
  }
}
