import {
  ANIMAL_SPECS,
  CROP_SPECS,
  DEFAULT_GAME_CONFIG,
  ENGINE_VERSION,
  LAND_ORDER,
  LAND_PRICES,
  MARKET_ACTION_TYPES,
  PRODUCT_IDS,
  SHOP_IDS,
  SHOP_PRODUCTS,
  hireCost,
} from "./constants.ts"
import {
  consumeMarketSupply,
  createMarket,
  marketPriceFromSupply,
  sellIntoMarket,
} from "./market.ts"
import { hashSeed, nextRandom, randomInt } from "./rng.ts"
import type {
  AnimalPlot,
  CreateGameOptions,
  CropPlot,
  FarmState,
  FarmTile,
  GameAction,
  GameConfig,
  GameState,
  PlayerId,
  ProductId,
  QuadrantId,
  ReplayEvent,
  ShopId,
  TileContent,
  TurnInput,
} from "./types.ts"

const PLAYERS = [0, 1] as const
const MAX_SHOP_INSTANCES = 8

type EventDraft = Omit<ReplayEvent, "id" | "turn" | "day" | "hour">

function recordEvent(state: GameState, event: EventDraft): void {
  const full: ReplayEvent = {
    ...event,
    id: `${state.turn}:${state.lastEvents.length}:${event.kind}`,
    turn: state.turn,
    day: state.day,
    hour: state.hour,
  }
  state.lastEvents.push(full)
  state.eventLog.push(full)
}

function reject(
  state: GameState,
  playerId: PlayerId,
  action: GameAction,
  reason: string,
): void {
  recordEvent(state, {
    kind: "rejected",
    playerId,
    title: "Order rejected",
    detail: `${action.type}: ${reason}`,
    importance: 1,
  })
}

export function quadrantForTile(x: number, y: number, boardSize: number): QuadrantId {
  const half = Math.floor(boardSize / 2)
  return `${y < half ? "N" : "S"}${x < half ? "W" : "E"}` as QuadrantId
}

export function tileId(x: number, y: number): string {
  return `${x}:${y}`
}

function createTiles(boardSize: number): FarmTile[] {
  const tiles: FarmTile[] = []
  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const quadrant = quadrantForTile(x, y, boardSize)
      tiles.push({
        id: tileId(x, y),
        x,
        y,
        quadrant,
        locked: quadrant !== "NW",
        content: null,
      })
    }
  }
  return tiles
}

function emptyStock(): Record<ProductId, number> {
  const stock = {} as Record<ProductId, number>
  for (const product of PRODUCT_IDS) stock[product] = 0
  return stock
}

function sanitizeConfig(patch?: Partial<GameConfig>): GameConfig {
  const config = { ...DEFAULT_GAME_CONFIG, ...patch }
  config.boardSize = Math.max(4, Math.floor(config.boardSize))
  if (config.boardSize % 2 !== 0) config.boardSize += 1
  config.days = Math.max(1, Math.floor(config.days))
  config.turnsPerDay = Math.max(1, Math.floor(config.turnsPerDay))
  config.startingMoney = Math.max(0, Math.floor(config.startingMoney))
  config.weedSpawnChance = Math.max(0, Math.min(1, config.weedSpawnChance))
  config.maxMarketOrdersPerTurn = Math.max(
    1,
    Math.floor(config.maxMarketOrdersPerTurn),
  )
  config.townShopUnlockInterval = Math.max(
    1,
    Math.floor(config.townShopUnlockInterval),
  )
  config.townShopSellInterval = Math.max(
    1,
    Math.floor(config.townShopSellInterval),
  )
  config.townCenterSellInterval = Math.max(
    1,
    Math.floor(config.townCenterSellInterval),
  )
  return config
}

export function createGame(options: CreateGameOptions = {}): GameState {
  const seed = hashSeed(options.seed)
  const config = sanitizeConfig(options.config)
  const names = options.playerNames ?? ["You", "Public baseline"]

  const farms = PLAYERS.map((playerId) => ({
    playerId,
    name: names[playerId],
    money: config.startingMoney,
    workers: 1,
    hiresToday: 0,
    unlockedQuadrants: ["NW"] as QuadrantId[],
    tiles: createTiles(config.boardSize),
    stock: emptyStock(),
    discardedUnits: 0,
  })) as [FarmState, FarmState]

  return {
    engineVersion: ENGINE_VERSION,
    config,
    seed,
    rngState: seed,
    turn: 0,
    day: 0,
    hour: 0,
    status: "running",
    farms,
    market: createMarket(),
    town: { unlockedShops: [] },
    lastEvents: [],
    eventLog: [],
    previousLeader: null,
  }
}

/** Clone the mutable frontier while sharing immutable historic event objects. */
export function cloneGameState(state: GameState): GameState {
  const farms = state.farms.map((farm) => ({
    ...farm,
    unlockedQuadrants: [...farm.unlockedQuadrants],
    stock: { ...farm.stock },
    tiles: farm.tiles.map((tile) => ({
      ...tile,
      content: tile.content ? { ...tile.content } : null,
    })),
  })) as [FarmState, FarmState]
  return {
    ...state,
    config: { ...state.config },
    farms,
    market: {
      supply: { ...state.market.supply },
      prices: { ...state.market.prices },
      previousPrices: { ...state.market.previousPrices },
    },
    town: { unlockedShops: [...state.town.unlockedShops] },
    lastEvents: [...state.lastEvents],
    eventLog: [...state.eventLog],
  }
}

export function findTile(farm: FarmState, id: string): FarmTile | undefined {
  return farm.tiles.find((tile) => tile.id === id)
}

export function cropAge(state: GameState, crop: CropPlot): number {
  return state.day - crop.plantedDay
}

export function animalAge(state: GameState, animal: AnimalPlot): number {
  return state.day - animal.placedDay
}

export function isHarvestable(state: GameState, content: TileContent): boolean {
  if (content.kind === "weed") return false
  if (content.kind === "animal") return content.yieldUnits > 0
  const spec = CROP_SPECS[content.crop]
  return content.yieldUnits > 0 && cropAge(state, content) >= spec.firstYieldDay
}

/**
 * Preflight one player order without changing the clock. The interactive client
 * uses this before dispatching so a typo or stale plot selection cannot become a
 * rejected replay turn. The engine still validates every action at execution
 * time because replays and other callers are untrusted.
 */
export function actionIssue(
  state: GameState,
  action: GameAction,
  playerId: PlayerId = 0,
): string | null {
  if (state.status !== "running") return "the season is already closed"
  const farm = state.farms[playerId]
  const tileFor = (id: string): FarmTile | string => {
    const tile = findTile(farm, id)
    if (!tile) return "unknown plot"
    if (tile.locked) return "buy this quadrant first"
    return tile
  }
  const requireTile = (id: string): FarmTile | string => tileFor(id)

  switch (action.type) {
    case "wait":
      return null
    case "plant": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content) return "that plot is occupied"
      return farm.money < CROP_SPECS[action.crop].seedCost ? "insufficient cash" : null
    }
    case "water": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content?.kind !== "crop") return "only crops can be watered"
      return tile.content.wateredToday ? "that crop is already watered today" : null
    }
    case "fertilize": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content?.kind !== "crop") return "only crops can be fertilized"
      return farm.stock.FERTILIZER < 1 ? "no fertilizer in stock" : null
    }
    case "harvest": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      return tile.content && isHarvestable(state, tile.content) ? null : "nothing is ready to harvest"
    }
    case "clear": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      return tile.content?.kind === "weed" ? null : "only weeds can be cleared"
    }
    case "placeAnimal": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content) return "that plot is occupied"
      return farm.money < ANIMAL_SPECS[action.animal].cost ? "insufficient cash" : null
    }
    case "feed": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content?.kind !== "animal") return "only livestock can be fed"
      if (tile.content.fedToday) return "that animal is already fed today"
      return farm.stock.WHEAT > 0 || farm.money >= state.market.prices.WHEAT
        ? null
        : "no wheat and insufficient cash"
    }
    case "care": {
      const tile = requireTile(action.tileId)
      if (typeof tile === "string") return tile
      if (tile.content?.kind !== "animal") return "only livestock can be cared for"
      return tile.content.caredToday ? "that animal is already cared for today" : null
    }
    case "sell":
      if (!Number.isFinite(action.amount) || Math.floor(action.amount) < 1) return "choose at least one unit to sell"
      return farm.stock[action.product] > 0 ? null : `no ${action.product.toLowerCase()} is available to sell`
    case "hire":
      return farm.money < hireCost(farm.hiresToday) ? "insufficient cash to hire" : null
    case "buyLand": {
      const extraUnlocked = farm.unlockedQuadrants.length - 1
      const cost = LAND_PRICES[extraUnlocked]
      if (cost === undefined) return "all quadrants are already owned"
      return farm.money < cost ? "insufficient cash to buy land" : null
    }
  }
}

function unlockedTile(
  state: GameState,
  playerId: PlayerId,
  action: GameAction,
  id: string,
): FarmTile | undefined {
  const tile = findTile(state.farms[playerId], id)
  if (!tile) {
    reject(state, playerId, action, "unknown tile")
    return undefined
  }
  if (tile.locked) {
    reject(state, playerId, action, "buy this quadrant first")
    return undefined
  }
  return tile
}

function applyPlant(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "plant" }>,
): void {
  const farm = state.farms[playerId]
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content) {
    reject(state, playerId, action, "tile is occupied")
    return
  }
  const spec = CROP_SPECS[action.crop]
  if (farm.money < spec.seedCost) {
    reject(state, playerId, action, "insufficient cash")
    return
  }

  farm.money -= spec.seedCost
  tile.content = {
    kind: "crop",
    crop: action.crop,
    plantedDay: state.day,
    wateredToday: false,
    consecutiveDryDays: 1,
    yieldUnits: spec.ongoing ? 0 : 1,
    productionCount: 0,
    fertilizedUntilDay: -1,
  }
  recordEvent(state, {
    kind: "plant",
    playerId,
    product: action.crop,
    tileId: tile.id,
    value: spec.seedCost,
    title: `${action.crop.toLowerCase()} planted`,
    detail: `Cash outlay ${spec.seedCost}; first possible yield in ${spec.firstYieldDay} days.`,
    importance: action.crop === "MELON" ? 2 : 1,
  })
}

function applyWater(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "water" }>,
): void {
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content?.kind !== "crop") {
    reject(state, playerId, action, "only crops can be watered")
    return
  }
  const crop = tile.content
  if (crop.wateredToday) {
    reject(state, playerId, action, "already watered today")
    return
  }
  crop.wateredToday = true

  const spec = CROP_SPECS[crop.crop]
  const age = cropAge(state, crop)
  const windowStart = Math.ceil(spec.maxYieldDay / 2)
  if (!spec.ongoing && age >= windowStart && age <= spec.maxYieldDay) {
    const bonus = crop.fertilizedUntilDay >= state.day ? 2 : 1
    crop.yieldUnits = Math.min(spec.maxYield, crop.yieldUnits + bonus)
  }
  recordEvent(state, {
    kind: "water",
    playerId,
    product: crop.crop,
    tileId: tile.id,
    title: "Upkeep paid in turns",
    detail: `${crop.crop.toLowerCase()} at ${tile.id} is serviced for day ${state.day + 1}.`,
    importance: 1,
  })
}

function applyFertilize(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "fertilize" }>,
): void {
  const farm = state.farms[playerId]
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content?.kind !== "crop") {
    reject(state, playerId, action, "only crops can be fertilized")
    return
  }
  if (farm.stock.FERTILIZER < 1) {
    reject(state, playerId, action, "no fertilizer in stock")
    return
  }
  farm.stock.FERTILIZER -= 1
  tile.content.fertilizedUntilDay = Math.max(
    tile.content.fertilizedUntilDay,
    state.day + 2,
  )
  recordEvent(state, {
    kind: "fertilize",
    playerId,
    product: tile.content.crop,
    tileId: tile.id,
    title: "Yield window levered",
    detail: "Fertilizer doubles eligible watering bonuses for three days.",
    importance: 2,
  })
}

function applyHarvest(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "harvest" }>,
): void {
  const farm = state.farms[playerId]
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile?.content || !isHarvestable(state, tile.content)) {
    reject(state, playerId, action, "nothing is ready")
    return
  }

  const content = tile.content
  if (content.kind === "crop") {
    const units = content.yieldUnits
    farm.stock[content.crop] += units
    content.yieldUnits = 0
    const product = content.crop
    if (!CROP_SPECS[content.crop].ongoing) tile.content = null
    recordEvent(state, {
      kind: "harvest",
      playerId,
      product,
      tileId: tile.id,
      value: units,
      title: `${units} ${product.toLowerCase()} harvested`,
      detail: "Output moved into the public teaching-sim warehouse.",
      importance: units >= 4 ? 2 : 1,
    })
    return
  }

  if (content.kind === "animal") {
    const spec = ANIMAL_SPECS[content.animal]
    const units = content.yieldUnits
    farm.stock[spec.product] += units
    content.yieldUnits = 0
    recordEvent(state, {
      kind: "harvest",
      playerId,
      product: spec.product,
      tileId: tile.id,
      value: units,
      title: `${units} ${spec.product.toLowerCase()} collected`,
      detail: "Recurring output is ready for the shared market.",
      importance: units >= 3 ? 2 : 1,
    })
  }
}

function applyClear(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "clear" }>,
): void {
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content?.kind !== "weed") {
    reject(state, playerId, action, "only weeds can be cleared")
    return
  }
  tile.content = null
}

function applyPlaceAnimal(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "placeAnimal" }>,
): void {
  const farm = state.farms[playerId]
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content) {
    reject(state, playerId, action, "tile is occupied")
    return
  }
  const spec = ANIMAL_SPECS[action.animal]
  if (farm.money < spec.cost) {
    reject(state, playerId, action, "insufficient cash")
    return
  }
  farm.money -= spec.cost
  tile.content = {
    kind: "animal",
    animal: action.animal,
    placedDay: state.day,
    fedToday: false,
    caredToday: false,
    consecutiveHungryDays: 0,
    yieldUnits: 0,
    pendingCareBonus: 0,
  }
  recordEvent(state, {
    kind: "animal",
    playerId,
    product: spec.product,
    tileId: tile.id,
    value: spec.cost,
    title: `${action.animal.toLowerCase()} added`,
    detail: `Recurring asset acquired for ${spec.cost}; daily feed remains a running cost.`,
    importance: 2,
  })
}

function applyFeed(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "feed" }>,
): void {
  const farm = state.farms[playerId]
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content?.kind !== "animal") {
    reject(state, playerId, action, "only livestock can be fed")
    return
  }
  if (tile.content.fedToday) {
    reject(state, playerId, action, "already fed today")
    return
  }

  if (farm.stock.WHEAT > 0) {
    farm.stock.WHEAT -= 1
  } else {
    const price = state.market.prices.WHEAT
    if (farm.money < price) {
      reject(state, playerId, action, "no wheat and insufficient cash")
      return
    }
    farm.money -= price
    state.market = consumeMarketSupply(state.market, { WHEAT: 1 })
  }
  tile.content.fedToday = true
}

function applyCare(
  state: GameState,
  playerId: PlayerId,
  action: Extract<GameAction, { type: "care" }>,
): void {
  const tile = unlockedTile(state, playerId, action, action.tileId)
  if (!tile) return
  if (tile.content?.kind !== "animal") {
    reject(state, playerId, action, "only livestock can be cared for")
    return
  }
  if (tile.content.caredToday) {
    reject(state, playerId, action, "already cared for today")
    return
  }
  tile.content.caredToday = true
  recordEvent(state, {
    kind: "care",
    playerId,
    tileId: tile.id,
    title: "Future yield banked",
    detail: "Care adds to the next fed production event, but consumes a worker action now.",
    importance: 1,
  })
}

function applyWorkerAction(state: GameState, playerId: PlayerId, action: GameAction): void {
  switch (action.type) {
    case "plant":
      applyPlant(state, playerId, action)
      return
    case "water":
      applyWater(state, playerId, action)
      return
    case "fertilize":
      applyFertilize(state, playerId, action)
      return
    case "harvest":
      applyHarvest(state, playerId, action)
      return
    case "clear":
      applyClear(state, playerId, action)
      return
    case "placeAnimal":
      applyPlaceAnimal(state, playerId, action)
      return
    case "feed":
      applyFeed(state, playerId, action)
      return
    case "care":
      applyCare(state, playerId, action)
      return
    case "wait":
      return
    default:
      reject(state, playerId, action, "market order used in a worker slot")
  }
}

interface PendingMarketOrder {
  action: Extract<GameAction, { type: "sell" | "hire" | "buyLand" }>
  remaining: number
  executed: number
  revenue: number
  firstPrice: number
  beforePrice: number
}

function isMarketAction(
  action: GameAction,
): action is Extract<GameAction, { type: "sell" | "hire" | "buyLand" }> {
  return MARKET_ACTION_TYPES.has(action.type)
}

function makeMarketQueue(
  state: GameState,
  playerId: PlayerId,
  actions: GameAction[],
): PendingMarketOrder[] {
  const limited = actions
    .filter(isMarketAction)
    .slice(0, state.config.maxMarketOrdersPerTurn)

  return limited.map((action) => {
    if (action.type === "sell") {
      const requested = Math.max(0, Math.floor(action.amount))
      const available = state.farms[playerId].stock[action.product]
      const remaining = Math.min(requested, available)
      return {
        action,
        remaining,
        executed: 0,
        revenue: 0,
        firstPrice: state.market.prices[action.product],
        beforePrice: state.market.prices[action.product],
      }
    }
    return {
      action,
      remaining: 1,
      executed: 0,
      revenue: 0,
      firstPrice: 0,
      beforePrice: 0,
    }
  })
}

function finishSaleEvent(
  state: GameState,
  playerId: PlayerId,
  order: PendingMarketOrder,
): void {
  if (order.action.type !== "sell") return
  if (order.executed <= 0) {
    reject(state, playerId, order.action, "no units available")
    return
  }
  const product = order.action.product
  const average = order.revenue / order.executed
  const after = state.market.prices[product]
  recordEvent(state, {
    kind: "sale",
    playerId,
    product,
    value: order.revenue,
    title: `${order.executed} ${product.toLowerCase()} sold`,
    detail: `Average ${average.toFixed(1)} coins; shared quote moved ${order.beforePrice} → ${after}.`,
    importance: order.executed >= 4 || Math.abs(after - order.beforePrice) >= 5 ? 2 : 1,
  })
}

function executeInstantMarketOrder(
  state: GameState,
  playerId: PlayerId,
  order: PendingMarketOrder,
): void {
  const farm = state.farms[playerId]
  const action = order.action

  if (action.type === "hire") {
    const cost = hireCost(farm.hiresToday)
    if (farm.money < cost) {
      reject(state, playerId, action, "insufficient cash")
    } else {
      farm.money -= cost
      farm.hiresToday += 1
      farm.workers += 1
      recordEvent(state, {
        kind: "hire",
        playerId,
        value: cost,
        title: `Worker ${farm.workers} hired`,
        detail: `Today’s action ceiling rises by ${state.config.turnsPerDay}; the next hire costs ${hireCost(farm.hiresToday)}.`,
        importance: farm.workers >= 3 ? 2 : 1,
      })
    }
    order.remaining = 0
    order.executed = 1
    return
  }

  if (action.type === "buyLand") {
    const extraUnlocked = farm.unlockedQuadrants.length - 1
    const quadrant = LAND_ORDER[extraUnlocked]
    const cost = LAND_PRICES[extraUnlocked]
    if (!quadrant || cost === undefined) {
      reject(state, playerId, action, "all quadrants already owned")
    } else if (farm.money < cost) {
      reject(state, playerId, action, "insufficient cash")
    } else {
      farm.money -= cost
      farm.unlockedQuadrants.push(quadrant)
      for (const tile of farm.tiles) {
        if (tile.quadrant === quadrant) tile.locked = false
      }
      recordEvent(state, {
        kind: "land",
        playerId,
        value: cost,
        title: `${quadrant} field unlocked`,
        detail: `25 additional tiles acquired for ${cost} coins. Capacity only pays if turns can service it.`,
        importance: 3,
      })
    }
    order.remaining = 0
    order.executed = 1
  }
}

/** Unit-level interleaving makes shared-market impact symmetric and inspectable. */
function processMarketActions(
  state: GameState,
  actionsByPlayer: [GameAction[], GameAction[]],
): void {
  const queues: [PendingMarketOrder[], PendingMarketOrder[]] = [
    makeMarketQueue(state, 0, actionsByPlayer[0]),
    makeMarketQueue(state, 1, actionsByPlayer[1]),
  ]
  const positions: [number, number] = [0, 0]
  const first: PlayerId = state.turn % 2 === 0 ? 0 : 1
  const order: readonly [PlayerId, PlayerId] = first === 0 ? [0, 1] : [1, 0]

  while (positions[0] < queues[0].length || positions[1] < queues[1].length) {
    let progressed = false
    for (const playerId of order) {
      const pending = queues[playerId][positions[playerId]]
      if (!pending) continue
      progressed = true

      if (pending.action.type === "sell") {
        if (pending.remaining > 0) {
          const product = pending.action.product
          const sale = sellIntoMarket(state.market, product, 1)
          state.market = sale.market
          state.farms[playerId].stock[product] -= 1
          state.farms[playerId].money += sale.revenue
          pending.remaining -= 1
          pending.executed += 1
          pending.revenue += sale.revenue
          if (pending.executed === 1) pending.firstPrice = sale.firstPrice
        }
        if (pending.remaining <= 0) {
          finishSaleEvent(state, playerId, pending)
          positions[playerId] += 1
        }
      } else {
        executeInstantMarketOrder(state, playerId, pending)
        positions[playerId] += 1
      }
    }
    if (!progressed) break
  }
}

function normalizeTurnActions(input: TurnInput): [GameAction[], GameAction[]] {
  return PLAYERS.map((playerId) => {
    const value = input[playerId]
    if (!value) return [{ type: "wait" } satisfies GameAction]
    return Array.isArray(value) ? [...value] : [value as GameAction]
  }) as [GameAction[], GameAction[]]
}

function processWorkerActions(
  state: GameState,
  actionsByPlayer: [GameAction[], GameAction[]],
): void {
  for (const playerId of PLAYERS) {
    const farm = state.farms[playerId]
    const workerActions = actionsByPlayer[playerId].filter(
      (action) => !MARKET_ACTION_TYPES.has(action.type),
    )
    if (workerActions.length > farm.workers) {
      recordEvent(state, {
        kind: "rejected",
        playerId,
        title: "Action ceiling reached",
        detail: `${workerActions.length - farm.workers} worker orders were dropped; hire before scaling upkeep.`,
        importance: 2,
      })
    }
    for (const action of workerActions.slice(0, farm.workers)) {
      applyWorkerAction(state, playerId, action)
    }
  }
}

function townDemandForTurn(state: GameState): Partial<Record<ProductId, number>> {
  const demand: Partial<Record<ProductId, number>> = {}
  if (state.turn % state.config.townShopSellInterval === 0) {
    for (const shop of state.town.unlockedShops) {
      const products = SHOP_PRODUCTS[shop]
      const units = products.length === 1 ? 2 : 1
      for (const product of products) demand[product] = (demand[product] ?? 0) + units
    }
  }
  if (state.turn % state.config.townCenterSellInterval === 0) {
    for (const product of PRODUCT_IDS) {
      if (product !== "FERTILIZER") demand[product] = (demand[product] ?? 0) + 1
    }
  }
  return demand
}

function processTown(state: GameState): void {
  const before = { ...state.market.prices }
  state.market = consumeMarketSupply(state.market, townDemandForTurn(state))
  for (const product of PRODUCT_IDS) {
    const change = state.market.prices[product] - before[product]
    if (Math.abs(change) >= Math.max(5, before[product] * 0.08)) {
      recordEvent(state, {
        kind: "market-move",
        product,
        value: change,
        title: `${product.toLowerCase()} repriced`,
        detail: `Shared quote moved ${before[product]} → ${state.market.prices[product]} after orders and town demand.`,
        importance: Math.abs(change) >= before[product] * 0.2 ? 3 : 2,
      })
    }
  }
}

function refreshCrop(
  state: GameState,
  playerId: PlayerId,
  tile: FarmTile,
  crop: CropPlot,
  nextDay: number,
): void {
  const watered = crop.wateredToday
  crop.consecutiveDryDays = watered ? 0 : crop.consecutiveDryDays + 1
  crop.wateredToday = false
  if (crop.consecutiveDryDays >= 2) {
    const product = crop.crop
    tile.content = { kind: "weed" }
    recordEvent(state, {
      kind: "crop-lost",
      playerId,
      product,
      tileId: tile.id,
      title: `${product.toLowerCase()} became a weed`,
      detail: "Two missed watering days destroyed the invested seed and occupied the tile.",
      importance: 3,
    })
    return
  }

  const spec = CROP_SPECS[crop.crop]
  if (spec.ongoing) {
    const daysSinceFirst = nextDay - crop.plantedDay - spec.firstYieldDay
    if (
      daysSinceFirst >= 0 &&
      daysSinceFirst % spec.interval === 0 &&
      crop.productionCount < spec.maxYield
    ) {
      const fertilized = watered && crop.fertilizedUntilDay >= state.day
      crop.yieldUnits += fertilized ? 2 : 1
      crop.productionCount += 1
    }
    if (crop.productionCount >= spec.maxYield && crop.yieldUnits <= 0) {
      tile.content = { kind: "weed" }
    }
    return
  }

  // Unharvested one-time crops decay after their maximum yield day.
  const age = nextDay - crop.plantedDay
  if (age > spec.maxYieldDay + 1 && (age - spec.maxYieldDay) % 2 === 0) {
    crop.yieldUnits = Math.max(0, crop.yieldUnits - 1)
    if (crop.yieldUnits === 0) tile.content = { kind: "weed" }
  }
}

function refreshAnimal(
  state: GameState,
  playerId: PlayerId,
  tile: FarmTile,
  animal: AnimalPlot,
  nextDay: number,
): void {
  const fed = animal.fedToday
  animal.consecutiveHungryDays = fed ? 0 : animal.consecutiveHungryDays + 1
  if (animal.consecutiveHungryDays >= 2) {
    const animalId = animal.animal
    tile.content = null
    recordEvent(state, {
      kind: "animal-lost",
      playerId,
      product: ANIMAL_SPECS[animalId].product,
      tileId: tile.id,
      title: `${animalId.toLowerCase()} escaped`,
      detail: "Two unfed days erased the recurring asset.",
      importance: 3,
    })
    return
  }

  const spec = ANIMAL_SPECS[animal.animal]
  const daysSinceFirst = nextDay - animal.placedDay - spec.firstYieldDay
  if (daysSinceFirst >= 0 && daysSinceFirst % spec.interval === 0) {
    const bonus = fed ? animal.pendingCareBonus : 0
    animal.yieldUnits = Math.min(spec.maxHeld, animal.yieldUnits + 1 + bonus)
    animal.pendingCareBonus = 0
  }
  if (animal.caredToday && fed) animal.pendingCareBonus += 1
  animal.fedToday = false
  animal.caredToday = false
  state.farms[playerId].stock.FERTILIZER += 1
}

function maybeSpawnWeed(state: GameState, playerId: PlayerId, tile: FarmTile): void {
  if (tile.locked || tile.content) return
  const sample = nextRandom(state.rngState)
  state.rngState = sample.state
  if (sample.value >= state.config.weedSpawnChance) return
  tile.content = { kind: "weed" }
  recordEvent(state, {
    kind: "weed",
    playerId,
    tileId: tile.id,
    title: "Weed shock",
    detail: "Idle land acquired an upkeep claim before it could earn cash flow.",
    importance: 1,
  })
}

function endDay(state: GameState): void {
  const nextDay = state.day + 1
  for (const playerId of PLAYERS) {
    const farm = state.farms[playerId]
    for (const tile of farm.tiles) {
      if (tile.content?.kind === "crop") {
        refreshCrop(state, playerId, tile, tile.content, nextDay)
      } else if (tile.content?.kind === "animal") {
        refreshAnimal(state, playerId, tile, tile.content, nextDay)
      }
      maybeSpawnWeed(state, playerId, tile)
    }
    farm.workers = 1
    farm.hiresToday = 0
  }

  if (
    nextDay > 0 &&
    nextDay % state.config.townShopUnlockInterval === 0 &&
    state.town.unlockedShops.length < MAX_SHOP_INSTANCES
  ) {
    const choice = randomInt(state.rngState, SHOP_IDS.length)
    state.rngState = choice.state
    const shop = SHOP_IDS[choice.value] as ShopId
    state.town.unlockedShops.push(shop)
    recordEvent(state, {
      kind: "shop",
      title: `${shop.toLowerCase().replaceAll("_", " ")} opened`,
      detail: `Town demand now pulls ${SHOP_PRODUCTS[shop].join(", ").toLowerCase()} from the shared market.`,
      importance: 2,
    })
  }

  recordEvent(state, {
    kind: "day-close",
    title: `Day ${nextDay} closed`,
    detail: "Workers reset; care failures settle; the remaining horizon is shorter.",
    importance: nextDay % 5 === 0 ? 2 : 1,
  })
}

function updateLeader(state: GameState): void {
  const [left, right] = state.farms
  const nextLeader: PlayerId | null =
    left.money === right.money ? null : left.money > right.money ? 0 : 1
  if (nextLeader !== null && nextLeader !== state.previousLeader) {
    recordEvent(state, {
      kind: "lead-change",
      playerId: nextLeader,
      value: Math.abs(left.money - right.money),
      title: `${state.farms[nextLeader].name} takes the lead`,
      detail: `Bank advantage ${Math.abs(left.money - right.money).toFixed(0)} coins. Only the sign matters at season close.`,
      importance: 3,
    })
  }
  state.previousLeader = nextLeader
}

export function stepGame(state: GameState, input: TurnInput = {}): GameState {
  if (state.status === "finished") return cloneGameState(state)

  const next = cloneGameState(state)
  next.lastEvents = []
  const actionsByPlayer = normalizeTurnActions(input)

  processWorkerActions(next, actionsByPlayer)
  processMarketActions(next, actionsByPlayer)
  processTown(next)

  const nextTurn = next.turn + 1
  if (nextTurn % next.config.turnsPerDay === 0) endDay(next)

  updateLeader(next)
  next.turn = nextTurn
  next.day = Math.floor(nextTurn / next.config.turnsPerDay)
  next.hour = nextTurn % next.config.turnsPerDay

  const totalTurns = next.config.days * next.config.turnsPerDay
  if (nextTurn >= totalTurns) {
    next.status = "finished"
    recordEvent(next, {
      kind: "season-close",
      title: "Season book closed",
      detail: `Final banks: ${next.farms[0].money.toFixed(0)} vs ${next.farms[1].money.toFixed(0)}. Unsold stock has no terminal value.`,
      importance: 3,
    })
  }

  return next
}

export function totalTurns(state: GameState): number {
  return state.config.days * state.config.turnsPerDay
}

export function winner(state: GameState): PlayerId | null {
  if (state.farms[0].money === state.farms[1].money) return null
  return state.farms[0].money > state.farms[1].money ? 0 : 1
}

export function currentMarketPrice(state: GameState, product: ProductId): number {
  // Calculate from supply as a state-integrity cross-check rather than trusting
  // a possibly stale cached quote.
  return marketPriceFromSupply(product, state.market.supply[product])
}
