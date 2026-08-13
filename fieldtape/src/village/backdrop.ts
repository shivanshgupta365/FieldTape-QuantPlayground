/**
 * Sky, distant ranges and the light of day.
 *
 * The village used to sit on a flat sky wash, which is why it read as a diamond
 * floating in nothing rather than a valley. Three parallax ridge layers with
 * haze between them give the map somewhere to be.
 *
 * Everything here is drawn in the LOW-RESOLUTION buffer, so it pixelates with
 * the rest of the scene. Parallax offsets are rounded to whole source pixels —
 * sub-pixel drift makes distant ranges shimmer as the camera moves, which is far
 * more noticeable than the parallax itself.
 */

import { PAL, type DayPhase } from "../art/palette"

type Ctx = CanvasRenderingContext2D

/** Deterministic 1D value noise for ridge silhouettes. */
function ridgeHeight(x: number, seed: number, scale: number): number {
  const a = Math.sin((x + seed * 37) * 0.013 * scale) * 0.5
  const b = Math.sin((x + seed * 91) * 0.031 * scale) * 0.3
  const c = Math.sin((x + seed * 13) * 0.071 * scale) * 0.2
  return a + b + c
}

export function drawSky(ctx: Ctx, w: number, h: number, phase: DayPhase): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, phase.sky[0])
  g.addColorStop(0.55, phase.sky[1])
  g.addColorStop(1, phase.sky[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

/** Sun or moon, plus a soft bloom. Sits behind the ranges. */
export function drawCelestialBody(ctx: Ctx, w: number, h: number, phase: DayPhase): void {
  const x = Math.round(phase.bodyX * w)
  // Arc: highest at midday, low at dawn and dusk.
  const arc = Math.sin(phase.bodyX * Math.PI)
  const y = Math.round(h * (0.42 - arc * 0.3))
  const r = phase.bodyIsMoon ? 7 : 10

  const bloom = ctx.createRadialGradient(x, y, 0, x, y, r * 5)
  bloom.addColorStop(0, phase.bodyIsMoon ? "rgb(200 216 240 / 34%)" : "rgb(255 226 150 / 42%)")
  bloom.addColorStop(1, "rgb(0 0 0 / 0%)")
  ctx.fillStyle = bloom
  ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10)

  ctx.fillStyle = phase.bodyIsMoon ? "#e6ecf5" : PAL.goldLight
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  if (phase.bodyIsMoon) {
    // Crescent by subtraction — cheaper and cleaner than masking.
    ctx.fillStyle = phase.sky[0]
    ctx.beginPath()
    ctx.arc(x + 4, y - 2, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Stars, only at night, deterministic so they do not crawl between frames. */
export function drawStars(ctx: Ctx, w: number, h: number, phase: DayPhase): void {
  if (!phase.bodyIsMoon) return
  ctx.fillStyle = "rgb(233 240 250 / 78%)"
  for (let i = 0; i < 70; i += 1) {
    const x = Math.round((Math.sin(i * 12.9898) * 43758.5453) % 1 * w)
    const y = Math.round((Math.sin(i * 78.233) * 12345.6789) % 1 * h * 0.5)
    ctx.fillRect(Math.abs(x), Math.abs(y), 1, 1)
  }
}

interface RidgeLayer {
  /** 0 = furthest. Controls parallax rate, haze and darkness. */
  seed: number
  baseline: number
  amplitude: number
  scale: number
  parallax: number
  colour: string
  snowline: number | null
}

const LAYERS: RidgeLayer[] = [
  { seed: 3, baseline: 0.30, amplitude: 0.17, scale: 0.55, parallax: 0.04, colour: "#8fa9bd", snowline: 0.20 },
  { seed: 7, baseline: 0.38, amplitude: 0.15, scale: 0.9, parallax: 0.09, colour: "#6d8c9c", snowline: 0.29 },
  { seed: 11, baseline: 0.47, amplitude: 0.11, scale: 1.5, parallax: 0.16, colour: "#55786b", snowline: null },
]

/**
 * @param camX Camera offset in screen pixels; drives parallax.
 */
export function drawRanges(
  ctx: Ctx,
  w: number,
  h: number,
  camX: number,
  phase: DayPhase,
): void {
  LAYERS.forEach((layer, index) => {
    // Whole-pixel offset only. Fractional parallax shimmers.
    const shift = Math.round(-camX * layer.parallax)
    const base = h * layer.baseline

    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 2) {
      const y = base - ridgeHeight(x - shift, layer.seed, layer.scale) * h * layer.amplitude
      ctx.lineTo(x, Math.round(y))
    }
    ctx.lineTo(w, h)
    ctx.closePath()

    ctx.fillStyle = layer.colour
    ctx.fill()

    // Snow caps on the two far ranges, clipped to the silhouette.
    if (layer.snowline !== null) {
      ctx.save()
      ctx.clip()
      ctx.fillStyle = phase.bodyIsMoon ? "#b9c6d6" : PAL.snow
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w; x += 2) {
        const ridge =
          base - ridgeHeight(x - shift, layer.seed, layer.scale) * h * layer.amplitude
        // Only the parts of the ridge that poke above the snowline.
        const y = Math.min(h, Math.max(ridge, h * layer.snowline))
        ctx.lineTo(x, Math.round(y === h * layer.snowline ? ridge : y))
      }
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // Atmospheric haze: more on distant layers. This is what actually creates
    // the sense of depth — the silhouettes alone read as flat cut-outs.
    const haze = ctx.createLinearGradient(0, base - h * layer.amplitude, 0, h)
    const strength = 0.34 - index * 0.1
    haze.addColorStop(0, `rgb(207 220 216 / ${Math.round(strength * 40)}%)`)
    haze.addColorStop(1, `rgb(207 220 216 / ${Math.round(strength * 100)}%)`)
    ctx.fillStyle = haze
    ctx.fillRect(0, base - h * layer.amplitude - 2, w, h - base + h * layer.amplitude + 2)
  })
}

/** Water haze band where the lake meets the far shore. */
export function drawLakeHaze(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.58)
  g.addColorStop(0, "rgb(207 220 216 / 46%)")
  g.addColorStop(1, "rgb(207 220 216 / 0%)")
  ctx.fillStyle = g
  ctx.fillRect(0, h * 0.42, w, h * 0.18)
}

/** Time-of-day grade over the finished frame. */
export function applyDayTint(ctx: Ctx, w: number, h: number, phase: DayPhase): void {
  if (phase.tintAlpha <= 0) return
  ctx.save()
  // Night reads as desaturated and blue: multiply. Warm phases read as light
  // added to the scene: overlay. Using one blend mode for both makes dusk muddy.
  ctx.globalCompositeOperation = phase.bodyIsMoon ? "multiply" : "overlay"
  ctx.globalAlpha = phase.tintAlpha
  ctx.fillStyle = phase.tint
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
