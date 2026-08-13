/**
 * Minimap. Necessary rather than decorative: at 256 units across, the valley no
 * longer fits in one view, so without a map the player has no way to know a
 * quarry or a high tarn exists, let alone find one again.
 *
 * The terrain layer is rasterised ONCE into an offscreen canvas from the same
 * height and region functions the mesh uses, then blitted every frame with only
 * the markers redrawn. Sampling 128x128 heights per frame would cost more than
 * the 3D scene it sits on top of.
 */

import { useEffect, useRef } from "react"
import { PAL } from "../art/palette"
import { HALF, WORLD, heightAt, regionAt } from "./terrain"

const SIZE = 168
/** Terrain samples across. Lower is coarser and cheaper; 96 looks deliberate. */
const SAMPLES = 96

const REGION_INK: Record<string, string> = {
  lake: "#2f5d75",
  tarn: "#3f7d92",
  shore: "#c8b48a",
  village: "#7ea86a",
  meadow: "#86ac72",
  forest: "#4c6d46",
  orchard: "#8fa863",
  vineyard: "#9aa65e",
  highland: "#7d8a63",
  ridge: "#9a9184",
}

function rasterTerrain(): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = SAMPLES
  canvas.height = SAMPLES
  const ctx = canvas.getContext("2d")!
  const step = WORLD / SAMPLES

  for (let iz = 0; iz < SAMPLES; iz += 1) {
    for (let ix = 0; ix < SAMPLES; ix += 1) {
      const wx = -HALF + ix * step
      const wz = -HALF + iz * step
      const region = regionAt(wx, wz)
      const h = heightAt(wx, wz)

      ctx.fillStyle = REGION_INK[region] ?? PAL.grass
      ctx.fillRect(ix, iz, 1, 1)

      // Cheap relief shading: compare against the neighbour uphill. Without it
      // the map is flat colour blocks and the ridge is invisible.
      const hx = heightAt(wx + step, wz)
      const shade = Math.max(-1, Math.min(1, (h - hx) / 6))
      if (shade > 0.06) {
        ctx.fillStyle = `rgb(255 255 255 / ${Math.round(shade * 46)}%)`
        ctx.fillRect(ix, iz, 1, 1)
      } else if (shade < -0.06) {
        ctx.fillStyle = `rgb(0 0 0 / ${Math.round(-shade * 46)}%)`
        ctx.fillRect(ix, iz, 1, 1)
      }

      if (h > 52) {
        ctx.fillStyle = "rgb(255 255 255 / 55%)"
        ctx.fillRect(ix, iz, 1, 1)
      }
    }
  }
  return canvas
}

export interface MinimapMarker {
  x: number
  z: number
  found: boolean
}

export interface MinimapHandle {
  update: (player: { x: number; z: number; heading: number }, markers: MinimapMarker[]) => void
}

export function Minimap({ handleRef }: { handleRef: React.MutableRefObject<MinimapHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const terrainRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!terrainRef.current) terrainRef.current = rasterTerrain()
    const terrain = terrainRef.current

    canvas.width = SIZE
    canvas.height = SIZE
    ctx.imageSmoothingEnabled = false

    const toMap = (v: number) => ((v + HALF) / WORLD) * SIZE

    handleRef.current = {
      update(player, markers) {
        ctx.clearRect(0, 0, SIZE, SIZE)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(terrain, 0, 0, SAMPLES, SAMPLES, 0, 0, SIZE, SIZE)

        for (const m of markers) {
          const mx = toMap(m.x)
          const mz = toMap(m.z)
          ctx.fillStyle = m.found ? PAL.gold : "rgb(21 20 15 / 62%)"
          ctx.fillRect(Math.round(mx) - 2, Math.round(mz) - 2, 4, 4)
          if (m.found) {
            ctx.fillStyle = PAL.ink
            ctx.fillRect(Math.round(mx) - 1, Math.round(mz) - 1, 2, 2)
          }
        }

        // Player: a triangle pointing along the heading, so the map tells you
        // which way you are facing as well as where you are.
        const px = toMap(player.x)
        const pz = toMap(player.z)
        ctx.save()
        ctx.translate(px, pz)
        ctx.rotate(-player.heading)
        ctx.fillStyle = PAL.cream
        ctx.beginPath()
        ctx.moveTo(0, -5)
        ctx.lineTo(3.5, 4)
        ctx.lineTo(-3.5, 4)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = PAL.ink
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      },
    }

    return () => {
      handleRef.current = null
    }
  }, [handleRef])

  return (
    <div className="v3d-minimap">
      <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} aria-hidden="true" />
      <span>Lucerne valley</span>
    </div>
  )
}
