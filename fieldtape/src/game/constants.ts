import type {
  AnimalId,
  CropId,
  GameConfig,
  ProductId,
  QuadrantId,
  ShopId,
} from "./types.ts"

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

export const ENGINE_VERSION = "alpstead-engine-v1" as const

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardSize: 10,
  days: 30,
  turnsPerDay: 24,
  startingMoney: 2_500,
  weedSpawnChance: 0.006,
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

/**
 * Alpstead balance table. These are OUR numbers.
 *
 * They are tuned for the shape of the game we want — a real tension between
 * fast cheap cash flow and slow expensive payoff inside a thirty-day wall — and
 * are not derived from any third-party source. Change them freely; bump
 * BRAND.balanceVersion when you do, because saved scores stop being comparable.
 *
 * Design intent per crop:
 *   RYE-fast staple    cheap, quick, thin margin. Pays the bills, wins nothing.
 *   ROOT               slightly richer staple, one day slower.
 *   VINE (ongoing)     mid cost, pays a stream once established.
 *   BERRY (ongoing)    expensive, slow, best total yield if you have the days.
 *   GOURD              the lottery ticket. Huge unit price, brutal lockup.
 */
export const CROP_SPECS: Record<CropId, CropSpec> = {
  WHEAT: {
    seedCost: 12,
    firstYieldDay: 2,
    maxYieldDay: 4,
    interval: 0,
    maxYield: 5,
    ongoing: false,
  },
  CARROT: {
    seedCost: 24,
    firstYieldDay: 3,
    maxYieldDay: 4,
    interval: 0,
    maxYield: 5,
    ongoing: false,
  },
  TOMATO: {
    seedCost: 55,
    firstYieldDay: 7,
    maxYieldDay: 7,
    interval: 1,
    maxYield: 5,
    ongoing: true,
  },
  STRAWBERRY: {
    seedCost: 110,
    firstYieldDay: 9,
    maxYieldDay: 9,
    interval: 2,
    maxYield: 5,
    ongoing: true,
  },
  MELON: {
    seedCost: 90,
    firstYieldDay: 11,
    maxYieldDay: 13,
    interval: 0,
    maxYield: 6,
    ongoing: false,
  },
}

export const ANIMAL_SPECS: Record<AnimalId, AnimalSpec> = {
  GOOSE: { cost: 280, firstYieldDay: 4, interval: 1, maxHeld: 4, product: "EGG" },
  COW: { cost: 420, firstYieldDay: 7, interval: 2, maxHeld: 6, product: "MILK" },
  SHEEP: { cost: 520, firstYieldDay: 6, interval: 3, maxHeld: 6, product: "WOOL" },
}

const I0 = 10_000

export const MARKET_CURVES: Record<ProductId, MarketCurve> = {
  WHEAT: {
    base: 28,
    equilibrium: I0,
    throughput: 400,
    scarcityShape: "sqrt",
    scarcityTarget: 0.8,
    glutShape: "log",
    glutTarget: 0.2,
  },
  CARROT: {
    base: 38,
    equilibrium: I0,
    throughput: 450,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "sqrt",
    glutTarget: 0.7,
  },
  TOMATO: {
    base: 64,
    equilibrium: I0,
    throughput: 200,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "sqrt",
    glutTarget: 0.6,
  },
  STRAWBERRY: {
    base: 128,
    equilibrium: I0,
    throughput: 100,
    scarcityShape: "sqrt",
    scarcityTarget: 0.7,
    glutShape: "linear",
    glutTarget: 1.6,
  },
  MELON: {
    base: 240,
    equilibrium: I0,
    throughput: 300,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "square",
    glutTarget: 3.6,
  },
  EGG: {
    base: 54,
    equilibrium: I0,
    throughput: 332,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "log",
    glutTarget: 0.2,
  },
  MILK: {
    base: 150,
    equilibrium: I0,
    throughput: 122,
    scarcityShape: "sqrt",
    scarcityTarget: 0.6,
    glutShape: "linear",
    glutTarget: 1.6,
  },
  WOOL: {
    base: 210,
    equilibrium: I0,
    throughput: 105,
    scarcityShape: "log",
    scarcityTarget: 0.2,
    glutShape: "square",
    glutTarget: 3.2,
  },
  FERTILIZER: {
    base: 95,
    equilibrium: I0,
    throughput: 200,
    scarcityShape: "linear",
    scarcityTarget: 0.4,
    glutShape: "linear",
    glutTarget: 0.4,
  },
}

export const LAND_ORDER: QuadrantId[] = ["NE", "SW", "SE"]
export const LAND_PRICES = [900, 2_100, 4_400] as const

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
