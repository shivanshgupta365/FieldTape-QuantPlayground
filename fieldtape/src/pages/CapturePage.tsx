/**
 * DEV-ONLY sprite sheet. Never registered in a production build — see App.tsx.
 *
 * Exists because the game board only shows the sprites the current game state
 * happens to contain. At day 1 turn 0 nothing is planted, so there is no way to
 * see a mature melon or a sheep without playing 12 in-game days. This renders
 * every sprite in every state at once, at large scale, so the art can be
 * iterated on directly.
 */

import { useEffect, useMemo, useRef } from "react"
import { ANIMAL_IDS, CROP_IDS, baselineAction, createGame, stepGame } from "../game"
import type { AnimalId, CropId } from "../game/types"
import { canvasTilesFromState } from "../lib/gameView"
import { FarmCanvas } from "../render/FarmCanvas"
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
} from "../render/atlas"

const S = 6
const GAP = 4

interface Cell {
  caption: string
  paint: (ctx: CanvasRenderingContext2D, key: string) => void
}

function buildCells(): Cell[] {
  const cells: Cell[] = [
    { caption: "grass", paint: (c, k) => drawGrass(c, k, S, false) },
    { caption: "locked scrub", paint: (c, k) => drawGrass(c, k, S, true) },
    { caption: "soil dry", paint: (c, k) => drawSoil(c, k, S, false) },
    { caption: "soil wet", paint: (c, k) => drawSoil(c, k, S, true) },
    { caption: "hedge", paint: (c, k) => drawHedge(c, k, S) },
    { caption: "weed", paint: (c, k) => { drawSoil(c, k, S, false); drawWeed(c, k, S) } },
  ]

  for (const crop of CROP_IDS as CropId[]) {
    for (const stage of [0, 1, 2, 3]) {
      cells.push({
        caption: `${crop.toLowerCase()} ${stage}`,
        paint: (c, k) => {
          drawSoil(c, k, S, true)
          drawCrop(c, crop, stage, k, S)
        },
      })
    }
  }

  for (const animal of ANIMAL_IDS as AnimalId[]) {
    cells.push({
      caption: animal.toLowerCase(),
      paint: (c, k) => { drawSoil(c, k, S, false); drawAnimal(c, animal, S) },
    })
  }

  cells.push(
    { caption: "dry mark", paint: (c, k) => { drawSoil(c, k, S, false); drawCrop(c, "WHEAT", 2, k, S); drawDryMark(c, S) } },
    { caption: "ready mark", paint: (c, k) => { drawSoil(c, k, S, true); drawCrop(c, "TOMATO", 3, k, S); drawReadyMark(c, S) } },
    { caption: "worker you", paint: (c, k) => { drawGrass(c, k, S); drawWorker(c, "human", S) } },
    { caption: "worker rival", paint: (c, k) => { drawGrass(c, k, S); drawWorker(c, "baseline", S) } },
  )

  return cells
}

export function CapturePage() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const cells = buildCells()
  const cols = 8
  const rows = Math.ceil(cells.length / cols)
  const cw = TILE * S + GAP
  const width = cols * cw
  const height = rows * (cw + 14)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = "#15140f"
    ctx.fillRect(0, 0, width, height)

    cells.forEach((cell, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const ox = col * cw
      const oy = row * (cw + 14)
      ctx.save()
      ctx.translate(ox, oy)
      cell.paint(ctx, `preview:${cell.caption}`)
      ctx.restore()
      ctx.fillStyle = "#a9a18f"
      ctx.font = "10px ui-monospace, monospace"
      ctx.fillText(cell.caption, ox, oy + TILE * S + 11)
    })
  }, [cells, cols, cw, width, height])

  // A real mid-season board. Isolated sprites cannot show whether the tiles sit
  // together as a field, which is the thing that actually has to look good.
  const scene = useMemo(() => {
    let state = createGame({ seed: "atlas-preview", playerNames: ["A", "B"] })
    const target = 15 * state.config.turnsPerDay
    while (state.status === "running" && state.turn < target) {
      state = stepGame(state, {
        // Measured day-15 occupancy: risk 36 crops but never waters (a board of
        // dry warnings), balanced 17 crops + 9 weeds, steady 21 crops well
        // tended, growth 0 crops. "steady" is the one that shows a working farm.
        0: baselineAction(state, 0, "steady"),
        1: baselineAction(state, 1, "balanced"),
      })
    }
    return state
  }, [])

  return (
    <main style={{ padding: 24, background: "#15140f", minHeight: "100vh" }}>
      <h1 style={{ color: "#f5f0e3", font: "600 14px ui-monospace, monospace", letterSpacing: ".1em" }}>
        ATLAS PREVIEW — DEV ONLY ({cells.length} sprites)
      </h1>
      <canvas ref={ref} style={{ width, height, imageRendering: "pixelated" }} />

      <h2 style={{ color: "#f5f0e3", font: "600 13px ui-monospace, monospace", letterSpacing: ".1em", marginTop: 28 }}>
        MID-SEASON BOARD — day {scene.day} of {scene.config.days}
      </h2>
      <FarmCanvas label="Preview farm" tiles={canvasTilesFromState(scene, 0)} />
    </main>
  )
}
