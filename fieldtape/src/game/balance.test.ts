/**
 * Alpstead balance invariants.
 *
 * Replaces the old third-party conformance test. The public game now ships its
 * own balance table, so the useful question is no longer "does this match an
 * upstream source" but "is this table still a game". These tests encode the
 * design intent, so a careless retune fails loudly instead of quietly producing
 * a crop nobody would ever plant.
 */

import { describe, expect, it } from "vitest"
import { ANIMAL_SPECS, CROP_SPECS, DEFAULT_GAME_CONFIG, LAND_PRICES, MARKET_CURVES } from "./constants"
import { CROP_IDS, PRODUCT_IDS } from "./constants"
import type { CropId } from "./types"

const SEASON = DEFAULT_GAME_CONFIG.days

describe("crop balance", () => {
  it.each(CROP_IDS)("%s can complete inside the season", (crop) => {
    const spec = CROP_SPECS[crop]
    const last = spec.ongoing
      ? spec.firstYieldDay + (spec.maxYield - 1) * spec.interval
      : spec.maxYieldDay
    // Planted on day 0 it must still finish, or the crop is undraftable.
    expect(last).toBeLessThan(SEASON)
  })

  it.each(CROP_IDS)("%s is profitable at base price if fully grown", (crop) => {
    const spec = CROP_SPECS[crop]
    const gross = spec.maxYield * MARKET_CURVES[crop].base
    expect(gross).toBeGreaterThan(spec.seedCost)
  })

  it("orders crops so that slower crops pay more per unit", () => {
    const byLockup = [...CROP_IDS].sort(
      (a, b) => CROP_SPECS[a].firstYieldDay - CROP_SPECS[b].firstYieldDay,
    )
    const prices = byLockup.map((c) => MARKET_CURVES[c].base)
    // Monotonic non-decreasing: a crop that locks capital longer must not also
    // pay less per unit, otherwise it is strictly dominated and dead content.
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]!).toBeGreaterThanOrEqual(prices[i - 1]!)
    }
  })

  it("keeps at least one crop viable as a late-season play", () => {
    const fast = CROP_IDS.filter((c: CropId) => CROP_SPECS[c].maxYieldDay <= 4)
    expect(fast.length).toBeGreaterThan(0)
  })

  it("keeps at least one crop that cannot be planted late", () => {
    const slow = CROP_IDS.filter((c: CropId) => CROP_SPECS[c].firstYieldDay >= 9)
    expect(slow.length).toBeGreaterThan(0)
  })
})

describe("animal balance", () => {
  it.each(Object.keys(ANIMAL_SPECS))("%s pays back before the season ends", (id) => {
    const spec = ANIMAL_SPECS[id as keyof typeof ANIMAL_SPECS]
    const productions = Math.floor((SEASON - spec.firstYieldDay) / Math.max(1, spec.interval))
    const gross = productions * spec.maxHeld * MARKET_CURVES[spec.product].base
    expect(gross).toBeGreaterThan(spec.cost)
  })
})

describe("market and land", () => {
  it("prices every tradeable product", () => {
    for (const product of PRODUCT_IDS) {
      expect(MARKET_CURVES[product].base).toBeGreaterThan(0)
    }
  })

  it("makes each land parcel strictly more expensive", () => {
    for (let i = 1; i < LAND_PRICES.length; i += 1) {
      expect(LAND_PRICES[i]!).toBeGreaterThan(LAND_PRICES[i - 1]!)
    }
  })

  it("cannot afford all land from the starting balance", () => {
    const total = LAND_PRICES.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(DEFAULT_GAME_CONFIG.startingMoney)
  })
})
