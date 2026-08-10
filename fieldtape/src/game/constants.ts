import type {
  AnimalId,
  CropId,
  GameConfig,
  ProductId,
  QuadrantId,
  ShopId,
} from "./types"

export interface CropSpec {
  seedCost: number
  firstYieldDay: number
  maxYieldDay: number
  interval: number
  maxYield: number
  ongoing: boolean
}

export interface AnimalSpec {
  cost: number
  firstYieldDay: number
  interval: number
  maxHeld: number
  product: ProductId
}

export interface MarketCurve {
  base: number
  equilibrium: number
  throughput: number
  scarcityShape: MarketShape
  scarcityTarget: number
  glutShape: MarketShape
  glutTarget: number
}

export type MarketShape = "linear" | "square" | "sqrt" | "log" | "log10"

export const ENGINE_VERSION = "fieldtape-engine-v1" as const

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardSize: 10,
  days: 30,
  turnsPerDay: 24,
  startingMoney: 3_000,
  weedSpawnChance: 0.005,
  maxMarketOrdersPerTurn: 10,
  townShopUnlockInterval: 3,
  townShopSellInterval: 4,
  townCenterSellInterval: 24,
}

export const CROP_IDS: CropId[] = [
  "WHEAT",
  "CARROT",
  "TOMATO",
  "STRAWBERRY",
  "MELON",
]

export const ANIMAL_IDS: AnimalId[] = ["GOOSE", "COW", "SHEEP"]

export const PRODUCT_IDS: ProductId[] = [
  ...CROP_IDS,
  "EGG",
  "MILK",
  "WOOL",
  "FERTILIZER",
]

export const CROP_SPECS: Record<CropId, CropSpec> = {
  WHEAT: {
    seedCost: 10,
    firstYieldDay: 2,
    maxYieldDay: 4,
    interval: 0,
    maxYield: 6,
    ongoing: false,
  },
  CARROT: {
    seedCost: 20,
    firstYieldDay: 2,
    maxYieldDay: 3,
    interval: 0,
    maxYield: 4,
    ongoing: false,
  },
  TOMATO: {
    seedCost: 50,
    firstYieldDay: 8,
    maxYieldDay: 8,
    interval: 1,
    maxYield: 4,
    ongoing: true,
  },
  STRAWBERRY: {
    seedCost: 100,
    firstYieldDay: 10,
    maxYieldDay: 10,
    interval: 2,
    maxYield: 4,
    ongoing: true,
  },
  MELON: {
    seedCost: 80,
    firstYieldDay: 10,
    maxYieldDay: 12,
    interval: 0,
    maxYield: 6,
    ongoing: false,
  },
}

export const ANIMAL_SPECS: Record<AnimalId, AnimalSpec> = {
  GOOSE: {
    cost: 300,
    firstYieldDay: 4,
    interval: 1,
    maxHeld: 4,
    product: "EGG",
  },
  COW: {
    cost: 400,
    firstYieldDay: 8,
    interval: 2,
    maxHeld: 6,
    product: "MILK",
  },
  SHEEP: {
    cost: 500,
    firstYieldDay: 6,
    interval: 3,
    maxHeld: 6,
    product: "WOOL",
  },
}

const I0 = 10_000

export const MARKET_CURVES: Record<ProductId, MarketCurve> = {
  WHEAT: {
    base: 25,
    equilibrium: I0,
    throughput: 400,
    scarcityShape: "sqrt",
    scarcityTarget: 0.8,
    glutShape: "log",
    glutTarget: 0.2,
  },
  CARROT: {
    base: 35,
    equilibrium: I0,
    throughput: 450,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "sqrt",
    glutTarget: 0.7,
  },
  TOMATO: {
    base: 60,
    equilibrium: I0,
    throughput: 200,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "sqrt",
    glutTarget: 0.6,
  },
  STRAWBERRY: {
    base: 120,
    equilibrium: I0,
    throughput: 100,
    scarcityShape: "sqrt",
    scarcityTarget: 0.7,
    glutShape: "linear",
    glutTarget: 1.6,
  },
  MELON: {
    base: 250,
    equilibrium: I0,
    throughput: 300,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "square",
    glutTarget: 3.6,
  },
  EGG: {
    base: 50,
    equilibrium: I0,
    throughput: 332,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "log",
    glutTarget: 0.2,
  },
  MILK: {
    base: 160,
    equilibrium: I0,
    throughput: 122,
    scarcityShape: "sqrt",
    scarcityTarget: 0.6,
    glutShape: "linear",
    glutTarget: 1.6,
  },
  WOOL: {
    base: 200,
    equilibrium: I0,
    throughput: 105,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "square",
    glutTarget: 3.2,
  },
  FERTILIZER: {
    base: 100,
    equilibrium: I0,
    throughput: 200,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "linear",
    glutTarget: 0.4,
  },
}

export const LAND_ORDER: QuadrantId[] = ["NE", "SW", "SE"]
export const LAND_PRICES = [1_000, 2_000, 4_000] as const

export const SHOP_PRODUCTS: Record<ShopId, ProductId[]> = {
  BAKERY: ["EGG", "WHEAT"],
  PIZZA_SHOP: ["MILK", "TOMATO", "WHEAT"],
  BRUNCH_SPOT: ["EGG", "WHEAT", "STRAWBERRY"],
  YARN_STORE: ["WOOL"],
  ICE_CREAM_SHOP: ["STRAWBERRY", "MILK", "WHEAT"],
  PET_CAFE: ["CARROT"],
  SMOOTHIE_SHOP: ["STRAWBERRY", "MILK"],
  FARMERS_MARKET: ["WHEAT", "CARROT", "TOMATO", "STRAWBERRY"],
}

export const SHOP_IDS = Object.keys(SHOP_PRODUCTS).sort() as ShopId[]

export const MARKET_ACTION_TYPES = new Set(["sell", "hire", "buyLand"])

export function hireCost(hiresToday: number): number {
  if (hiresToday <= 1) return 1
  let previous = 1
  let current = 1
  for (let index = 2; index <= hiresToday; index += 1) {
    const next = previous + current
    previous = current
    current = next
  }
  return current
}
