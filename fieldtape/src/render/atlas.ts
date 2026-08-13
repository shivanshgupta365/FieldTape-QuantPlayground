/**
 * Procedural pixel-art atlas for the farm board.
 *
 * Original art, generated as code. Three reasons it is drawn rather than
 * shipped as a PNG:
 *
 *  1. Ownership. Every sprite is ours outright, with no third-party asset
 *     licence to honour and nothing to re-clear before shipping commercially.
 *  2. Determinism. Every pixel is a pure function of tile coordinates, so two
 *     renders of the same replay frame are byte-identical. Texture noise comes
 *     from the engine's seeded PRNG, never Math.random.
 *  3. Payload. The whole atlas is a few KB of code instead of a sprite sheet,
 *     and it scales to any integer zoom without extra assets.
 *
 * Source resolution is 16x16 per tile, upscaled at integer factors with
 * smoothing disabled. Never draw at a fractional scale: it destroys the
 * pixel grid.
 */

import { hashSeed, nextRandom } from "../game/rng"
import type { AnimalId, CropId } from "../game/types"

export const TILE = 16

/** Brand palette, mirroring the CSS custom properties in styles/global.css. */
const C = {
  soil: "#6b4430",
  soilDark: "#3d2a20",
  soilLight: "#835540",
  // Wet soil must be obviously darker than dry: "is this tile watered" is the
  // single most frequent read in the game, and the first pass had them within
  // a few percent luminance of each other.
  wet: "#33221a",
  wetRidge: "#4a3527",
  wetTrough: "#221610",
  wetSheen: "#5c7472",
  grass: "#63895a",
  grassDark: "#4c6d46",
  grassLight: "#76a06a",
  scrub: "#8d9276",
  scrubDark: "#6f7359",
  scrubLight: "#a3a68a",
  gold: "#e7a72f",
  goldLight: "#f3c765",
  red: "#d85843",
  redDark: "#b23f2f",
  cream: "#f5f0e3",
  ink: "#15140f",
  orange: "#d9812f",
  melon: "#2f6b3a",
  melonPale: "#7bab5c",
  hedgeDeep: "#1f4527",
  white: "#efeade",
  pink: "#e08a8a",
  stem: "#4f7a45",
  stemDark: "#3a5c33",
  cyan: "#41b7ba",
} as const

/** Stable per-pixel noise. Keyed on coordinates, so it never changes per frame. */
function noise(x: number, y: number, salt: string): number {
  return (hashSeed(`${salt}:${x}:${y}`) % 1000) / 1000
}

/**
 * A few deterministic positions inside the tile.
 *
 * Terrain detail must be *sparse and clustered*, not per-pixel random. Testing
 * every pixel against a threshold — the first thing I tried here — produces
 * television static, because at 16x16 a 12% hit rate is ~30 speckles fighting
 * each other. Placing 4-6 deliberate marks instead is what reads as texture.
 */
function spots(key: string, count: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let state = hashSeed(key)
  for (let i = 0; i < count; i += 1) {
    let s = nextRandom(state)
    const x = Math.floor(s.value * TILE)
    state = s.state
    s = nextRandom(state)
    const y = Math.floor(s.value * TILE)
    state = s.state
    out.push([x, y])
  }
  return out
}

type Ctx = CanvasRenderingContext2D

/** Single source pixel. All drawing goes through this so scale stays integral. */
function px(ctx: Ctx, x: number, y: number, color: string, s: number): void {
  if (x < 0 || y < 0 || x >= TILE || y >= TILE) return
  ctx.fillStyle = color
  ctx.fillRect(x * s, y * s, s, s)
}

function rect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  s: number,
): void {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) px(ctx, x + dx, y + dy, color, s)
  }
}

// ---------------------------------------------------------------- terrain ---

export function drawGrass(ctx: Ctx, key: string, s: number, muted = false): void {
  rect(ctx, 0, 0, TILE, TILE, muted ? C.scrub : C.grass, s)

  // Grass blades: short vertical strokes, the classic 16-bit farm texture.
  const blades = spots(`${key}:blade`, muted ? 3 : 5)
  for (const [x, y] of blades) {
    const h = 2 + ((x + y) % 2)
    const tone = muted ? C.scrubDark : C.grassDark
    for (let i = 0; i < h; i += 1) px(ctx, x, y + i, tone, s)
    px(ctx, x + 1, y + h - 1, tone, s)
  }

  // A couple of highlights only, to imply sunlight without dithering.
  for (const [x, y] of spots(`${key}:lit`, 2)) {
    px(ctx, x, y, muted ? C.scrubLight : C.grassLight, s)
    px(ctx, x + 1, y, muted ? C.scrubLight : C.grassLight, s)
  }

  // Locked land gets dry scrub tufts so it reads as unworked, not just darker.
  if (muted) {
    for (const [x] of spots(`${key}:tuft`, 2)) {
      for (let i = 0; i < 3; i += 1) px(ctx, x, TILE - 2 - i, C.scrubDark, s)
      px(ctx, x - 1, TILE - 3, C.scrubDark, s)
      px(ctx, x + 1, TILE - 4, C.scrubDark, s)
    }
  }
}

/** Tilled soil: furrow ridges plus grain. Wet variant darkens and adds sheen. */
export function drawSoil(ctx: Ctx, key: string, s: number, wet: boolean): void {
  // Every tone shifts together for wet, so the whole tile darkens. Keeping the
  // ridge highlight at the dry base colour — which is what the first version
  // did — left half the rows bright and made watered and unwatered soil
  // indistinguishable at a glance. That is the most frequent read in the game,
  // so it has to survive a squint test.
  const base = wet ? C.wet : C.soil
  const ridge = wet ? C.wetRidge : C.soilLight
  const trough = wet ? C.wetTrough : C.soilDark

  // Each plot is an INSET square on grass, not an edge-to-edge fill.
  //
  // Filling the whole tile made a planted field read as one continuous brown
  // mass: the furrows on adjacent tiles line up, so plot boundaries vanished
  // and it became impossible to count tiles. Counting tiles is the core skill
  // of the game — the action budget is per tile — so the grid must be legible.
  // Insetting by one pixel and outlining gives every plot a discrete edge, and
  // matches how the reference art renders tilled soil on grass.
  drawGrass(ctx, `${key}:under`, s, false)

  const I = 1
  const W = TILE - I * 2
  rect(ctx, I, I, W, W, base, s)

  // Ploughed furrows, clipped to the inset plot.
  for (let y = I + 2; y < I + W; y += 4) {
    for (let x = I; x < I + W; x += 1) {
      px(ctx, x, y, trough, s)
      px(ctx, x, y - 1, ridge, s)
    }
  }

  // A few clods in the troughs. More than this reads as scattered debris.
  for (const [x, y] of spots(`${key}:clod`, 3)) {
    const cx = I + (x % W)
    const cy = I + 1 + Math.min(W - 2, Math.floor((y % W) / 4) * 4)
    px(ctx, cx, cy, trough, s)
    px(ctx, cx + 1 < I + W ? cx + 1 : cx, cy, ridge, s)
  }

  if (wet) {
    for (const [x, y] of spots(`${key}:sheen`, 2)) {
      px(ctx, I + (x % W), I + 2 + Math.min(W - 3, Math.floor((y % W) / 4) * 4), C.wetSheen, s)
    }
  }

  // Plot rim: dark on top/left, so plots read as sunken beds with a lip.
  for (let i = I; i < I + W; i += 1) {
    px(ctx, i, I, trough, s)
    px(ctx, I, i, trough, s)
  }
}

// ------------------------------------------------------------------ crops ---

/**
 * Each crop gets its own silhouette, not a shared shape recoloured.
 *
 * The first version parameterised one "bush" shape for carrot, tomato and
 * strawberry, which drew all three as the same triangle for stages 0 to 2 —
 * only the fruit colour at stage 3 told them apart. In a game where the whole
 * skill is reading your field at a glance, three crops that look identical for
 * most of their life is a real gameplay failure, not just an art one. So:
 * wheat is tall stalks, carrot is a lacy frond fan, tomato is a staked cane,
 * strawberry hugs the ground, melon is a sprawling vine with a fat striped
 * fruit. Distinguishable by shape alone, before colour.
 *
 * @param stage 0..3 — sprout, growing, full foliage, bearing fruit.
 */
export function drawCrop(
  ctx: Ctx,
  crop: CropId,
  stage: number,
  key: string,
  s: number,
): void {
  const st = Math.max(0, Math.min(3, Math.trunc(stage)))
  if (crop === "WHEAT") return drawWheat(ctx, st, key, s)
  if (crop === "CARROT") return drawCarrot(ctx, st, s)
  if (crop === "TOMATO") return drawTomato(ctx, st, s)
  if (crop === "STRAWBERRY") return drawStrawberry(ctx, st, s)
  return drawMelon(ctx, st, s)
}

/**
 * Ground line for plants.
 *
 * Must stay inside the inset plot drawn by drawSoil, which spans 1..TILE-2.
 * When the plot became inset this was still TILE-2, so carrot shoulders and
 * berries rendered one pixel below the plot rim and appeared to sit on the
 * grass outside their own tile.
 */
const BASE_Y = TILE - 3

/** Tall thin cereal. Gold grain heads are the ready signal. */
function drawWheat(ctx: Ctx, st: number, key: string, s: number): void {
  const h = [3, 7, 11, 12][st]!
  for (const sx of [4, 7, 10, 13]) {
    const hh = h - Math.floor(noise(sx, st, `${key}h`) * 2)
    for (let i = 0; i < hh; i += 1) px(ctx, sx, BASE_Y - i, C.stem, s)
    if (st >= 1) {
      px(ctx, sx - 1, BASE_Y - Math.floor(hh * 0.5), C.stem, s)
      px(ctx, sx + 1, BASE_Y - Math.floor(hh * 0.35), C.stemDark, s)
    }
    if (st >= 3) {
      // Grain head: a fat two-wide ear at the tip.
      const ty = BASE_Y - hh
      rect(ctx, sx - 1, ty, 2, 4, C.gold, s)
      px(ctx, sx - 1, ty, C.goldLight, s)
      px(ctx, sx, ty + 2, C.goldLight, s)
    }
  }
}

/** Lacy frond fan splaying from a single crown, plus an orange shoulder. */
function drawCarrot(ctx: Ctx, st: number, s: number): void {
  const spread = [1, 2, 4, 5][st]!
  const h = [3, 5, 8, 8][st]!
  for (let i = -spread; i <= spread; i += 1) {
    const tipX = 8 + i * 2
    const tipY = BASE_Y - h + Math.abs(i)
    // Thin diagonal frond, one pixel wide — reads as feathery, not solid.
    let x = 8
    let y = BASE_Y
    const steps = Math.max(Math.abs(tipX - x), Math.abs(tipY - y))
    for (let k = 0; k <= steps; k += 1) {
      x = 8 + Math.round(((tipX - 8) * k) / steps)
      y = BASE_Y + Math.round(((tipY - BASE_Y) * k) / steps)
      px(ctx, x, y, k > steps - 2 ? C.grassLight : C.stem, s)
    }
  }
  if (st >= 3) {
    rect(ctx, 7, BASE_Y, 3, 2, C.orange, s)
    px(ctx, 7, BASE_Y, C.gold, s)
    px(ctx, 9, BASE_Y + 1, C.redDark, s)
  }
}

/** Staked cane with paired leaves. Clearly the tallest bush. */
function drawTomato(ctx: Ctx, st: number, s: number): void {
  const h = [3, 6, 11, 11][st]!
  for (let i = 0; i < h; i += 1) px(ctx, 8, BASE_Y - i, C.stemDark, s)
  // Leaf pairs stepping up the cane.
  for (let level = 2; level < h; level += 3) {
    const w = 2 + (level < h - 3 ? 1 : 0)
    for (let d = 1; d <= w; d += 1) {
      px(ctx, 8 - d, BASE_Y - level, C.stem, s)
      px(ctx, 8 + d, BASE_Y - level - 1, C.stem, s)
    }
    px(ctx, 8 - w, BASE_Y - level - 1, C.grassLight, s)
  }
  if (st >= 3) {
    for (const [fx, fy] of [[4, 7], [11, 6], [6, 11]] as const) {
      rect(ctx, fx, fy, 3, 3, C.red, s)
      px(ctx, fx, fy, C.redDark, s)
      px(ctx, fx + 2, fy, C.redDark, s)
      px(ctx, fx + 1, fy, C.pink, s)
    }
  }
}

/** Ground-hugging rosette. Never exceeds half tile height. */
function drawStrawberry(ctx: Ctx, st: number, s: number): void {
  const w = [3, 6, 11, 11][st]!
  const h = [2, 3, 5, 5][st]!
  for (let i = 0; i < w; i += 1) {
    const x = 8 - Math.floor(w / 2) + i
    const lobe = h - (i % 2 === 0 ? 0 : 1)
    for (let j = 0; j < lobe; j += 1) {
      px(ctx, x, BASE_Y - j, j === lobe - 1 ? C.grassLight : C.stemDark, s)
    }
  }
  if (st >= 3) {
    for (const [fx, fy] of [[4, 11], [8, 12], [12, 11]] as const) {
      rect(ctx, fx, fy, 2, 2, C.red, s)
      px(ctx, fx, fy, C.pink, s)
      px(ctx, fx + 1, fy + 1, C.redDark, s)
    }
    // Tiny white flowers, the strawberry tell at a distance.
    px(ctx, 6, 9, C.cream, s)
    px(ctx, 11, 8, C.cream, s)
  }
}

/** Sprawling vine. At maturity a fat striped sphere dominates the tile. */
function drawMelon(ctx: Ctx, st: number, s: number): void {
  // Runner snaking left to right along the ground.
  const reach = [4, 8, 13, 13][st]!
  for (let i = 0; i < reach; i += 1) {
    const x = 2 + i
    const y = BASE_Y - (i % 4 === 0 ? 2 : i % 2 === 0 ? 1 : 0)
    px(ctx, x, y, C.melon, s)
  }
  // Broad lobed leaves along the runner.
  if (st >= 1) {
    for (const lx of st >= 2 ? [4, 9, 13] : [4]) {
      rect(ctx, lx - 1, BASE_Y - 4, 3, 3, C.stem, s)
      px(ctx, lx - 1, BASE_Y - 4, C.grassLight, s)
      px(ctx, lx + 1, BASE_Y - 2, C.stemDark, s)
    }
  }
  if (st >= 2) {
    // Immature fruit: small and pale, so stage 2 and 3 are not confusable.
    rect(ctx, 6, 9, 3, 3, C.melonPale, s)
    px(ctx, 6, 9, C.grassLight, s)
  }
  if (st >= 3) {
    // Mature melon: 7x6 striped sphere with a highlight.
    rect(ctx, 4, 7, 7, 6, C.melon, s)
    px(ctx, 4, 7, C.stem, s)
    px(ctx, 10, 7, C.stem, s)
    px(ctx, 4, 12, C.stem, s)
    px(ctx, 10, 12, C.stem, s)
    for (const sx of [5, 7, 9]) {
      for (let y = 7; y < 13; y += 1) px(ctx, sx, y, C.melonPale, s)
    }
    px(ctx, 6, 8, C.cream, s)
  }
}

// ---------------------------------------------------------------- animals ---

export function drawAnimal(ctx: Ctx, animal: AnimalId, s: number): void {
  if (animal === "GOOSE") {
    rect(ctx, 5, 7, 6, 5, C.white, s)
    rect(ctx, 9, 4, 3, 3, C.white, s)
    px(ctx, 12, 5, C.orange, s)
    px(ctx, 11, 5, C.ink, s)
    px(ctx, 6, 12, C.orange, s)
    px(ctx, 9, 12, C.orange, s)
    return
  }
  if (animal === "COW") {
    rect(ctx, 3, 6, 10, 6, C.white, s)
    rect(ctx, 11, 4, 4, 4, C.white, s)
    rect(ctx, 5, 7, 3, 3, C.ink, s)
    rect(ctx, 9, 9, 2, 2, C.ink, s)
    px(ctx, 14, 5, C.ink, s)
    px(ctx, 4, 12, C.ink, s)
    px(ctx, 11, 12, C.ink, s)
    px(ctx, 12, 3, C.cream, s)
    return
  }
  // Sheep: bumpy fleece silhouette reads differently from the cow's blocks.
  rect(ctx, 4, 6, 9, 6, C.cream, s)
  for (let x = 4; x < 13; x += 2) px(ctx, x, 5, C.cream, s)
  rect(ctx, 12, 7, 3, 3, C.ink, s)
  px(ctx, 14, 8, C.cream, s)
  px(ctx, 5, 12, C.ink, s)
  px(ctx, 11, 12, C.ink, s)
}

export function drawWeed(ctx: Ctx, key: string, s: number): void {
  for (const x of [4, 7, 10, 12]) {
    const h = 4 + Math.floor(noise(x, 1, `${key}w`) * 4)
    for (let i = 0; i < h; i += 1) {
      px(ctx, x, BASE_Y - i, C.scrub, s)
      if (i % 2 === 0) px(ctx, x + 1, BASE_Y - i, C.grassDark, s)
    }
  }
}

// --------------------------------------------------------------- overlays ---

/**
 * Dry crop: a thin amber tick in the top-left corner.
 *
 * Deliberately slim. The first version was a 2x4 block, which at 16px is an
 * eighth of the tile and visually outweighed the crop it was annotating — on a
 * field of unwatered plots the board became a wall of gold bars and you could
 * no longer see what was planted. The warning has to be noticeable without
 * becoming the subject. Always paired with an aria label, never colour alone.
 */
export function drawDryMark(ctx: Ctx, s: number): void {
  rect(ctx, 2, 2, 1, 3, C.gold, s)
  px(ctx, 2, 6, C.goldLight, s)
}

/** Ready to harvest: a small bright cue in the opposite corner from `dry`. */
export function drawReadyMark(ctx: Ctx, s: number): void {
  px(ctx, TILE - 3, 2, C.cream, s)
  rect(ctx, TILE - 4, 3, 3, 1, C.goldLight, s)
  rect(ctx, TILE - 3, 2, 1, 3, C.goldLight, s)
}

export function drawWorker(ctx: Ctx, kind: "human" | "baseline", s: number): void {
  const shirt = kind === "human" ? C.cyan : C.red
  rect(ctx, 6, 5, 4, 4, C.cream, s)
  rect(ctx, 5, 9, 6, 4, shirt, s)
  px(ctx, 7, 6, C.ink, s)
  px(ctx, 9, 6, C.ink, s)
  rect(ctx, 5, 3, 6, 2, C.gold, s)
}

/** Hedgerow that frames the farm, matching the reference art's boundary. */
export function drawHedge(ctx: Ctx, key: string, s: number): void {
  rect(ctx, 0, 0, TILE, TILE, C.hedgeDeep, s)
  // Dense overlapping leaf clusters. Sparse blobs read as random splotches
  // rather than a hedgerow, so this is deliberately near-full coverage with
  // only the lit top edges varying.
  for (const [x, y] of spots(`${key}:leaf`, 16)) {
    rect(ctx, x - 1, y - 1, 3, 3, C.melon, s)
    px(ctx, x - 1, y - 1, C.grassDark, s)
    px(ctx, x, y - 1, C.grassDark, s)
  }
  for (const [x, y] of spots(`${key}:leaflit`, 5)) {
    px(ctx, x, y, C.grass, s)
    px(ctx, x + 1, y, C.grass, s)
  }
}
