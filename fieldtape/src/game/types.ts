/**
 * FieldTape's public, deterministic teaching simulation.
 *
 * This is deliberately not a serialization of Kaggle observations. In
 * particular, `PublicReplayV1` has no shed, seed, worker-inventory, belief, or
 * policy fields. That makes it safe to publish synthetic baseline matches.
 */

export type PlayerId = 0 | 1

export type QuadrantId = "NW" | "NE" | "SW" | "SE"

export type CropId =
  | "WHEAT"
  | "CARROT"
  | "TOMATO"
  | "STRAWBERRY"
  | "MELON"

export type AnimalId = "GOOSE" | "COW" | "SHEEP"

export type ProductId =
  | CropId
  | "EGG"
  | "MILK"
  | "WOOL"
  | "FERTILIZER"

export type ShopId =
  | "BAKERY"
  | "PIZZA_SHOP"
  | "BRUNCH_SPOT"
  | "YARN_STORE"
  | "ICE_CREAM_SHOP"
  | "PET_CAFE"
  | "SMOOTHIE_SHOP"
  | "FARMERS_MARKET"

export type BaselineStyle = "balanced" | "growth" | "steady" | "risk"

export interface GameConfig {
  boardSize: number
  days: number
  turnsPerDay: number
  startingMoney: number
  weedSpawnChance: number
  maxMarketOrdersPerTurn: number
  townShopUnlockInterval: number
  townShopSellInterval: number
  townCenterSellInterval: number
}

export interface CropPlot {
  kind: "crop"
  crop: CropId
  plantedDay: number
  wateredToday: boolean
  consecutiveDryDays: number
  yieldUnits: number
  productionCount: number
  fertilizedUntilDay: number
}

export interface AnimalPlot {
  kind: "animal"
  animal: AnimalId
  placedDay: number
  fedToday: boolean
  caredToday: boolean
  consecutiveHungryDays: number
  yieldUnits: number
  pendingCareBonus: number
}

export interface WeedPlot {
  kind: "weed"
}

export type TileContent = CropPlot | AnimalPlot | WeedPlot

export interface FarmTile {
  id: string
  x: number
  y: number
  quadrant: QuadrantId
  locked: boolean
  content: TileContent | null
}

export interface FarmState {
  playerId: PlayerId
  name: string
  money: number
  workers: number
  hiresToday: number
  unlockedQuadrants: QuadrantId[]
  tiles: FarmTile[]
  /** Public teaching-sim warehouse. Never serialized into PublicReplayV1. */
  stock: Record<ProductId, number>
  discardedUnits: number
}

export interface MarketState {
  supply: Record<ProductId, number>
  prices: Record<ProductId, number>
  previousPrices: Record<ProductId, number>
}

export interface TownState {
  unlockedShops: ShopId[]
}

export type GameStatus = "running" | "finished"

export interface ReplayEvent {
  id: string
  turn: number
  day: number
  hour: number
  kind:
    | "plant"
    | "water"
    | "fertilize"
    | "harvest"
    | "sale"
    | "market-move"
    | "hire"
    | "land"
    | "animal"
    | "care"
    | "crop-lost"
    | "animal-lost"
    | "weed"
    | "shop"
    | "lead-change"
    | "rejected"
    | "day-close"
    | "season-close"
  title: string
  detail: string
  importance: 1 | 2 | 3
  playerId?: PlayerId
  product?: ProductId
  value?: number
  tileId?: string
}

export interface GameState {
  engineVersion: "fieldtape-engine-v1"
  config: GameConfig
  seed: number
  rngState: number
  turn: number
  day: number
  hour: number
  status: GameStatus
  farms: [FarmState, FarmState]
  market: MarketState
  town: TownState
  lastEvents: ReplayEvent[]
  eventLog: ReplayEvent[]
  previousLeader: PlayerId | null
}

export type GameAction =
  | { type: "plant"; tileId: string; crop: CropId }
  | { type: "water"; tileId: string }
  | { type: "fertilize"; tileId: string }
  | { type: "harvest"; tileId: string }
  | { type: "clear"; tileId: string }
  | { type: "placeAnimal"; tileId: string; animal: AnimalId }
  | { type: "feed"; tileId: string }
  | { type: "care"; tileId: string }
  | { type: "sell"; product: ProductId; amount: number }
  | { type: "hire" }
  | { type: "buyLand" }
  | { type: "wait" }

export type PlayerTurnActions = GameAction | readonly GameAction[]

export type TurnInput = Partial<Record<PlayerId, PlayerTurnActions>>

export interface CreateGameOptions {
  seed?: number | string
  config?: Partial<GameConfig>
  playerNames?: readonly [string, string]
}

export interface RunGameOptions {
  maxTurns?: number
  players?: readonly [BaselineStyle, BaselineStyle]
  onStep?: (state: GameState) => void
}

export interface PublicCropTile {
  kind: "crop"
  crop: CropId
  ageDays: number
  wateredToday: boolean
  ready: boolean
}

export interface PublicAnimalTile {
  kind: "animal"
  animal: AnimalId
  ageDays: number
  fedToday: boolean
  ready: boolean
}

export interface PublicWeedTile {
  kind: "weed"
}

export type PublicTileContent = PublicCropTile | PublicAnimalTile | PublicWeedTile

export interface PublicFarmTile {
  id: string
  x: number
  y: number
  quadrant: QuadrantId
  locked: boolean
  content: PublicTileContent | null
}

export interface PublicFarmFrame {
  playerId: PlayerId
  name: string
  money: number
  workers: number
  unlockedQuadrants: QuadrantId[]
  plantedTiles: number
  readyTiles: number
  estimatedStockValue: number
  tiles: PublicFarmTile[]
}

export interface PublicGameSnapshot {
  turn: number
  day: number
  hour: number
  status: GameStatus
  farms: [PublicFarmFrame, PublicFarmFrame]
  marketPrices: Record<ProductId, number>
  marketSupply: Record<ProductId, number>
  unlockedShops: ShopId[]
}

export interface PublicReplayTurn {
  turn: number
  actions: [GameAction[], GameAction[]]
  events: ReplayEvent[]
}

export interface PublicReplayCheckpoint {
  turn: number
  snapshot: PublicGameSnapshot
}

export interface PublicReplayV1 {
  kind: "fieldtape.public-replay"
  version: 1
  engineVersion: "fieldtape-engine-v1"
  id: string
  label: string
  synthetic: true
  seed: number
  config: GameConfig
  players: readonly [
    { name: string; baseline: BaselineStyle },
    { name: string; baseline: BaselineStyle },
  ]
  turns: PublicReplayTurn[]
  checkpoints: PublicReplayCheckpoint[]
  terminal: PublicGameSnapshot
  checksum: string
}

export interface ClockView {
  turn: number
  totalTurns: number
  day: number
  displayDay: number
  totalDays: number
  hour: number
  actionsLeftToday: number
  progress: number
}

export interface ScoreboardRow {
  playerId: PlayerId
  name: string
  money: number
  estimatedStockValue: number
  markToMarket: number
  lead: number
  rank: 1 | 2
}

export interface MarketTapeRow {
  product: ProductId
  price: number
  change: number
  changePct: number
  supply: number
}

export interface FarmMetrics {
  playerId: PlayerId
  actionCapacityToday: number
  actionsRemainingThisTurn: number
  occupiedTiles: number
  cropTiles: number
  animalTiles: number
  dryRiskTiles: number
  harvestableTiles: number
  unlockedTiles: number
  stockUnits: number
  discardedUnits: number
}
