/**
 * Single place for product identity. Import from here — never hardcode the name
 * in a component, or renaming means another sweep through forty files.
 */

export const BRAND = {
  name: "Alpstead",
  tagline: "Farm the valley. Read the market.",
  /** Longer line for hero sections and store listings. */
  pitch:
    "A cozy alpine farm above Lake Lucerne, where every seed is a bet and thirty days is the whole season.",
  /** One-sentence store blurb (Product Hunt, OG description). */
  blurb:
    "Alpstead is a farming game about capital, not soil. Thirty days, one shared market, and a valley that does not wait for you.",
  location: "Lucerne, Switzerland",
  /** Bumped when the balance table changes in a way that invalidates scores. */
  balanceVersion: "alpstead-balance-1",
} as const

export type Brand = typeof BRAND
