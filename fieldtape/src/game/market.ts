import { MARKET_CURVES, PRODUCT_IDS } from "./constants"
import type { MarketShape, MarketCurve } from "./constants"
import type { MarketState, ProductId } from "./types"

function shape(kind: MarketShape, input: number): number {
  const value = Math.max(0, input)
  switch (kind) {
    case "square":
      return value * value
    case "sqrt":
      return Math.sqrt(value)
    case "log":
      return Math.log1p(value)
    case "log10":
      return Math.log10(1 + value)
    case "linear":
    default:
      return value
  }
}

/** Match Python's `round` (ties to even), used by the official interpreter. */
function roundHalfToEven(value: number): number {
  const lower = Math.floor(value)
  const fraction = value - lower
  if (fraction < 0.5 - Number.EPSILON * 8) return lower
  if (fraction > 0.5 + Number.EPSILON * 8) return lower + 1
  return lower % 2 === 0 ? lower : lower + 1
}

export function marketPriceFromSupply(product: ProductId, supply: number): number {
  const curve: MarketCurve = MARKET_CURVES[product]
  const difference = supply - curve.equilibrium

  if (difference < 0) {
    const amplitude =
      (curve.scarcityTarget * curve.base) /
      shape(curve.scarcityShape, curve.throughput)
    const price =
      curve.base + amplitude * shape(curve.scarcityShape, Math.abs(difference))
    return Math.max(1, roundHalfToEven(price))
  }

  const amplitude =
    (curve.glutTarget * curve.base) / shape(curve.glutShape, curve.throughput)
  const price = curve.base - amplitude * shape(curve.glutShape, difference)
  return Math.max(1, roundHalfToEven(price))
}

export function createMarket(): MarketState {
  const supply = {} as Record<ProductId, number>
  const prices = {} as Record<ProductId, number>
  const previousPrices = {} as Record<ProductId, number>

  for (const product of PRODUCT_IDS) {
    supply[product] = MARKET_CURVES[product].equilibrium
    prices[product] = MARKET_CURVES[product].base
    previousPrices[product] = MARKET_CURVES[product].base
  }

  return { supply, prices, previousPrices }
}

export function refreshMarket(market: MarketState): MarketState {
  const prices = {} as Record<ProductId, number>
  for (const product of PRODUCT_IDS) {
    prices[product] = marketPriceFromSupply(product, market.supply[product])
  }
  return {
    supply: { ...market.supply },
    previousPrices: { ...market.prices },
    prices,
  }
}

export interface MarketSaleResult {
  market: MarketState
  revenue: number
  executedUnits: number
  firstPrice: number
  lastPrice: number
}

/**
 * Execute a sale unit by unit. The pre-sale quote is paid, matching the public
 * Kaggriculture price convention and making slippage visible to learners.
 */
export function sellIntoMarket(
  market: MarketState,
  product: ProductId,
  requestedUnits: number,
): MarketSaleResult {
  const units = Math.max(0, Math.floor(requestedUnits))
  const next: MarketState = {
    supply: { ...market.supply },
    prices: { ...market.prices },
    previousPrices: { ...market.previousPrices },
  }
  let revenue = 0
  let firstPrice = next.prices[product]
  let lastPrice = firstPrice

  for (let index = 0; index < units; index += 1) {
    const quote = marketPriceFromSupply(product, next.supply[product])
    if (index === 0) firstPrice = quote
    revenue += quote
    lastPrice = quote
    // At the floor, the official market accepts the unit without adding it to
    // supply, allowing demand to move the price again later.
    if (quote > 1) next.supply[product] += 1
  }

  next.previousPrices = { ...market.prices }
  next.prices[product] = marketPriceFromSupply(product, next.supply[product])

  return {
    market: next,
    revenue,
    executedUnits: units,
    firstPrice,
    lastPrice,
  }
}

export function consumeMarketSupply(
  market: MarketState,
  demands: Partial<Record<ProductId, number>>,
): MarketState {
  const next: MarketState = {
    supply: { ...market.supply },
    prices: { ...market.prices },
    previousPrices: { ...market.prices },
  }

  for (const product of PRODUCT_IDS) {
    const amount = Math.max(0, Math.floor(demands[product] ?? 0))
    next.supply[product] = Math.max(0, next.supply[product] - amount)
    next.prices[product] = marketPriceFromSupply(product, next.supply[product])
  }
  return next
}

export function productMarkToMarket(
  stock: Record<ProductId, number>,
  prices: Record<ProductId, number>,
): number {
  return PRODUCT_IDS.reduce(
    (total, product) => total + stock[product] * prices[product],
    0,
  )
}

export function saleSlippage(result: MarketSaleResult): number {
  if (result.executedUnits === 0) return 0
  const averagePrice = result.revenue / result.executedUnits
  return result.firstPrice - averagePrice
}
