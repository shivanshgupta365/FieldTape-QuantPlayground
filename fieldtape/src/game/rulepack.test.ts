/**
 * The browser engine's constants must equal the official rulepack.
 *
 * This project encodes the same published numbers in three places — this engine,
 * the private Python agent, and the Deno challenge verifier. Nothing kept them
 * equal, and they had drifted: the agent was using WHEAT max_yield 4 against an
 * official 6. This engine happened to be correct, and this test is what keeps it
 * that way.
 *
 * The rulepack is generated, never hand-written:
 *     agent/.venv/bin/python rules/extract_rulepack.py
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ANIMAL_SPECS,
  CROP_SPECS,
  DEFAULT_GAME_CONFIG,
  LAND_PRICES,
  MARKET_CURVES,
  PRODUCT_IDS,
  SHOP_PRODUCTS,
} from "./constants"
import type { CropId, ProductId, ShopId } from "./types"

interface Rulepack {
  crops: Record<string, {
    seed: number
    first_yield_day: number
    max_yield_day: number
    interval: number
    max_yield: number
    ongoing: boolean
  }>
  animals: Record<string, {
    cost: number
    first_yield_day: number
    interval: number
    max_held: number
    product: string
  }>
  products: string[]
  market: { params: Record<string, { base: number; T: number }> }
  land: { prices: number[]; order: string[] }
  shops: Record<string, string[]>
  configDefaults: Record<string, number>
}

// Resolved from the vitest root (fieldtape/), not import.meta.url — under
// vitest's transform the module URL is not a file: URL.
const packPath = resolve(process.cwd(), "../rules/kaggriculture.v1.json")
const pack = JSON.parse(readFileSync(packPath, "utf8")) as Rulepack

describe("rulepack conformance", () => {
  it("covers the same crops", () => {
    expect(Object.keys(CROP_SPECS).sort()).toEqual(Object.keys(pack.crops).sort())
  })

  it.each(Object.keys(pack.crops))("crop %s matches the official table", (crop) => {
    const official = pack.crops[crop]!
    const ours = CROP_SPECS[crop as CropId]
    expect(ours.seedCost).toBe(official.seed)
    expect(ours.firstYieldDay).toBe(official.first_yield_day)
    expect(ours.maxYieldDay).toBe(official.max_yield_day)
    expect(ours.interval).toBe(official.interval)
    expect(ours.maxYield).toBe(official.max_yield)
    expect(ours.ongoing).toBe(official.ongoing)
  })

  it.each(Object.keys(pack.animals))("animal %s matches", (animal) => {
    const official = pack.animals[animal]!
    const ours = ANIMAL_SPECS[animal as keyof typeof ANIMAL_SPECS]
    expect(ours.cost).toBe(official.cost)
    expect(ours.firstYieldDay).toBe(official.first_yield_day)
    expect(ours.interval).toBe(official.interval)
    expect(ours.maxHeld).toBe(official.max_held)
    expect(ours.product).toBe(official.product)
  })

  it("lists products in the official order", () => {
    expect(PRODUCT_IDS).toEqual(pack.products as ProductId[])
  })

  it.each(Object.keys(pack.market.params))("market base price for %s", (product) => {
    expect(MARKET_CURVES[product as ProductId].base).toBe(
      pack.market.params[product]!.base,
    )
  })

  it.each(Object.keys(pack.market.params))("market throughput for %s", (product) => {
    expect(MARKET_CURVES[product as ProductId].throughput).toBe(
      pack.market.params[product]!.T,
    )
  })

  it("matches land prices", () => {
    expect([...LAND_PRICES]).toEqual(pack.land.prices)
  })

  it.each(Object.keys(pack.shops))("shop %s demand matches", (shop) => {
    expect(SHOP_PRODUCTS[shop as ShopId]).toEqual(pack.shops[shop])
  })

  it("matches configuration defaults", () => {
    const cfg = pack.configDefaults
    expect(DEFAULT_GAME_CONFIG.boardSize).toBe(cfg.boardSize)
    expect(DEFAULT_GAME_CONFIG.turnsPerDay).toBe(cfg.turnsPerDay)
    expect(DEFAULT_GAME_CONFIG.startingMoney).toBe(cfg.startingMoney)
    expect(DEFAULT_GAME_CONFIG.maxMarketOrdersPerTurn).toBe(cfg.maxMarketOrdersPerTurn)
    expect(DEFAULT_GAME_CONFIG.weedSpawnChance).toBe(cfg.weedSpawnChance)
    expect(DEFAULT_GAME_CONFIG.townShopUnlockInterval).toBe(cfg.townShopUnlockInterval)
    expect(DEFAULT_GAME_CONFIG.townShopSellInterval).toBe(cfg.townShopSellInterval)
    expect(DEFAULT_GAME_CONFIG.townCenterSellInterval).toBe(cfg.townCenterSellInterval)
  })
})
