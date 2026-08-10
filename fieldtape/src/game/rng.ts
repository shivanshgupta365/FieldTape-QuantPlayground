/** Small, serializable PRNG helpers. Every function is referentially transparent. */

export function hashSeed(seed: number | string | undefined): number {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return (Math.trunc(seed) >>> 0) || 0x6d2b79f5
  }

  const text = String(seed ?? "fieldtape-demo")
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) || 0x6d2b79f5
}

export interface RandomSample {
  value: number
  state: number
}

/** Mulberry32's transition expressed without a closure so state is replayable. */
export function nextRandom(state: number): RandomSample {
  const next = (state + 0x6d2b79f5) >>> 0
  let value = next
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  value = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  return { value, state: next }
}

export function randomInt(state: number, maximumExclusive: number): {
  value: number
  state: number
} {
  const sample = nextRandom(state)
  return {
    value: Math.floor(sample.value * Math.max(1, maximumExclusive)),
    state: sample.state,
  }
}

export function deterministicIndex(seed: number, key: number, length: number): number {
  const mixed = hashSeed(`${seed}:${key}`)
  return mixed % Math.max(1, length)
}
