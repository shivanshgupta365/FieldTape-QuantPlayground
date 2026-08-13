/**
 * Farm board renderer: Canvas 2D pixels under a transparent, focusable DOM grid.
 *
 * Why hybrid rather than pure canvas. The board this replaces was a grid of
 * real <button> elements with per-tile aria labels, which gave it keyboard
 * navigation and screen-reader output for free. A pure canvas is a single
 * opaque element and would have thrown that away — and the project's own
 * acceptance criteria require keyboard navigation and a Lighthouse
 * accessibility score of 90 or better. So the canvas paints, and an
 * absolutely-positioned grid of transparent buttons on top owns all focus,
 * hit-testing and labelling.
 *
 * Why no requestAnimationFrame. The board is a pure function of
 * (tiles, selection) and repaints only when those change. There is no internal
 * animation clock to drift, so scrubbing a replay to turn N always produces
 * exactly the same frame. Adding a rAF loop later would break that guarantee.
 */

import { useEffect, useRef } from "react"
import type { AnimalId, CropId } from "../game/types"
import {
  TILE,
  drawAnimal,
  drawCrop,
  drawDryMark,
  drawGrass,
  drawHedge,
  drawReadyMark,
  drawSoil,
  drawWeed,
  drawWorker,
} from "./atlas"

export interface CanvasTile {
  id: string
  x: number
  y: number
  locked: boolean
  /** null renders as bare tilled soil. */
  crop: CropId | null
  animal: AnimalId | null
  weed: boolean
  /** 0..3 growth stage; only meaningful when `crop` is set. */
  stage: number
  watered: boolean
  ready: boolean
  worker: "human" | "baseline" | null
}

const BOARD = 10
/** One-tile hedgerow frame, so the farm reads as enclosed land. */
const PAD = 1

export function FarmCanvas({
  tiles,
  selectedId,
  onSelect,
  label,
  /**
   * Art scale. MUST be an integer — a fractional scale resamples the pixel grid
   * and turns crisp sprites into mush. 3 for the single-farm play view, 2 for
   * the two-farm spectator view where both boards must fit side by side.
   */
  scale = 3,
}: {
  tiles: readonly CanvasTile[]
  selectedId?: string
  onSelect?: (tile: CanvasTile) => void
  label: string
  scale?: number
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const SCALE = Math.max(1, Math.round(scale))

  const cells = (BOARD + PAD * 2) * TILE
  const cssSize = cells * SCALE

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Device-pixel-ratio aware, but the *art* scale stays an integer. Snapping
    // the backing store to a whole number of device pixels is what keeps the
    // pixel grid crisp on retina displays.
    const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)))
    canvas.width = cells * SCALE * dpr
    canvas.height = cells * SCALE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    const at = (tx: number, ty: number, fn: () => void) => {
      ctx.save()
      ctx.translate(tx * TILE * SCALE, ty * TILE * SCALE)
      fn()
      ctx.restore()
    }

    // Hedgerow frame.
    const outer = BOARD + PAD * 2
    for (let y = 0; y < outer; y += 1) {
      for (let x = 0; x < outer; x += 1) {
        const edge = x === 0 || y === 0 || x === outer - 1 || y === outer - 1
        if (edge) at(x, y, () => drawHedge(ctx, `${x},${y}`, SCALE))
      }
    }

    for (const tile of tiles) {
      const tx = tile.x + PAD
      const ty = tile.y + PAD
      const key = `${tile.x},${tile.y}`

      at(tx, ty, () => {
        if (tile.locked) {
          drawGrass(ctx, key, SCALE, true)
          return
        }
        // Unplanted but unlocked land stays grass; only worked tiles get soil.
        if (!tile.crop && !tile.animal && !tile.weed) {
          drawGrass(ctx, key, SCALE, false)
          return
        }
        drawSoil(ctx, key, SCALE, tile.watered)
        if (tile.weed) drawWeed(ctx, key, SCALE)
        if (tile.crop) drawCrop(ctx, tile.crop, tile.stage, key, SCALE)
        if (tile.animal) drawAnimal(ctx, tile.animal, SCALE)
        if (tile.crop && !tile.watered) drawDryMark(ctx, SCALE)
        if (tile.ready) drawReadyMark(ctx, SCALE)
      })

      if (tile.worker) at(tx, ty, () => drawWorker(ctx, tile.worker!, SCALE))
    }
  }, [tiles, cells, SCALE])

  return (
    <div className="farm-canvas-wrap" style={{ width: cssSize, height: cssSize }}>
      <canvas
        ref={ref}
        className="farm-canvas"
        style={{ width: cssSize, height: cssSize }}
        // The canvas is decorative; the overlay grid below carries the semantics.
        aria-hidden="true"
      />
      <div
        className="farm-hit-grid"
        role="grid"
        aria-label={`${label}, 10 by 10 farm`}
        style={{
          top: PAD * TILE * SCALE,
          left: PAD * TILE * SCALE,
          width: BOARD * TILE * SCALE,
          height: BOARD * TILE * SCALE,
        }}
      >
        {Array.from({ length: BOARD }, (_, row) => (
          <div className="farm-hit-row" role="row" key={`r${row}`}>
            {tiles.slice(row * BOARD, row * BOARD + BOARD).map((tile) => (
              <button
                key={tile.id}
                type="button"
                role="gridcell"
                className={`farm-hit${selectedId === tile.id ? " selected" : ""}`}
                disabled={tile.locked || !onSelect}
                onClick={() => !tile.locked && onSelect?.(tile)}
                aria-selected={selectedId === tile.id}
                aria-label={describe(tile)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Spoken description. Order matters: state first, then the urgent bit last. */
function describe(tile: CanvasTile): string {
  const at = `Plot ${tile.x + 1}, ${tile.y + 1}`
  if (tile.locked) return `${at}, locked land`
  if (tile.weed) return `${at}, weed, needs clearing`
  if (tile.animal) return `${at}, ${tile.animal.toLowerCase()}${tile.ready ? ", product ready" : ""}`
  if (tile.crop) {
    const parts = [`${at}, ${tile.crop.toLowerCase()}`, `stage ${tile.stage} of 3`]
    if (tile.ready) parts.push("ready to harvest")
    if (!tile.watered) parts.push("not watered, dies after two dry days")
    return parts.join(", ")
  }
  return `${at}, empty`
}
