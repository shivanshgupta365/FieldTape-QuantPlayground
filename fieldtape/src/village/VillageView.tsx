/**
 * Playable 2.5D village. Walk, drive, herd sheep, visit shops.
 *
 * Unlike the farm board this one DOES run an animation loop — it is a real-time
 * scene, not a seekable replay, so a fixed-timestep loop is correct here. The
 * two renderers stay separate for exactly that reason: mixing a live clock into
 * the deterministic board would break frame-exact scrubbing.
 *
 * Movement is on a float world position with tile-granular collision, which
 * gives smooth motion without letting the player clip into a chalet.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  MAP_H,
  MAP_W,
  TILE_H,
  TILE_W,
  VEHICLES,
  blocked,
  depth,
  driveable,
  elevationAt,
  parked,
  propNear,
  props,
  terrain,
  toScreen,
  type ParkedVehicle,
  type VehicleKind,
} from "./world"
import { drawFarmer, drawProp, drawSheep, drawTerrainTile, drawVehicle } from "./sprites"

interface Sheep {
  x: number
  y: number
  vx: number
  vy: number
}

const WALK_SPEED = 3.1

export function VillageView({ onPrompt }: { onPrompt?: (text: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [riding, setRiding] = useState<VehicleKind | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // All mutable scene state lives in refs: the render loop must not depend on
  // React state, or every frame would queue a re-render.
  const keys = useRef<Set<string>>(new Set())
  const player = useRef({ x: 8, y: 10, facing: 2, stride: 0, heading: 0 })
  const vehicles = useRef<ParkedVehicle[]>(parked.map((v) => ({ ...v })))
  const ridingRef = useRef<VehicleKind | null>(null)
  const sheep = useRef<Sheep[]>([
    { x: 13.5, y: 9.5, vx: 0, vy: 0 },
    { x: 14.2, y: 10.4, vx: 0, vy: 0 },
    { x: 12.8, y: 10.8, vx: 0, vy: 0 },
    { x: 15.0, y: 11.5, vx: 0, vy: 0 },
  ])
  const promptRef = useRef<string | null>(null)

  useEffect(() => {
    ridingRef.current = riding
  }, [riding])

  const interact = useCallback(() => {
    const p = player.current
    // Board or leave a vehicle first — it is the most likely intent.
    if (ridingRef.current) {
      setRiding(null)
      setNotice("You hop down.")
      return
    }
    const near = vehicles.current.find(
      (v) => Math.abs(v.x - p.x) + Math.abs(v.y - p.y) <= 1.8,
    )
    if (near) {
      setRiding(near.kind)
      setNotice(`${VEHICLES[near.kind].label} — arrow keys to drive, E to get out.`)
      return
    }
    const target = propNear(p.x, p.y)
    if (target?.interact) {
      setNotice(`${target.label ?? "Here"} — ${target.interact}.`)
    }
  }, [])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const k = event.key.toLowerCase()
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        event.preventDefault()
      }
      if (k === "e") {
        interact()
        return
      }
      keys.current.add(k)
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [interact])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let phase = 0
    let running = true

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const frame = (now: number) => {
      if (!running) return
      // Clamp dt: a backgrounded tab returns a huge delta that teleports the
      // player through walls, because collision is sampled per frame.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      phase += dt * 1.6

      step(dt)
      draw(ctx, canvas.clientWidth, canvas.clientHeight, phase)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------- simulation

  function step(dt: number): void {
    const k = keys.current
    const p = player.current

    // Screen-relative input: pressing up should go up the screen, which in an
    // isometric projection is world (-x, -y), not world -y.
    let ix = 0
    let iy = 0
    if (k.has("arrowup") || k.has("w")) { ix -= 1; iy -= 1 }
    if (k.has("arrowdown") || k.has("s")) { ix += 1; iy += 1 }
    if (k.has("arrowleft") || k.has("a")) { ix -= 1; iy += 1 }
    if (k.has("arrowright") || k.has("d")) { ix += 1; iy -= 1 }

    const mag = Math.hypot(ix, iy)
    const rider = ridingRef.current
    const spec = rider ? VEHICLES[rider] : null
    const speed = (spec?.speed ?? WALK_SPEED) * (k.has("shift") ? 1.6 : 1)

    if (mag > 0) {
      ix /= mag
      iy /= mag
      const nx = p.x + ix * speed * dt
      const ny = p.y + iy * speed * dt

      // Axis-separated collision so sliding along a wall feels right.
      const canX = spec ? driveable(spec, nx, p.y) : !blocked(Math.round(nx), Math.round(p.y))
      const canY = spec ? driveable(spec, p.x, ny) : !blocked(Math.round(p.x), Math.round(ny))
      if (canX) p.x = nx
      if (canY) p.y = ny

      p.x = Math.max(0, Math.min(MAP_W - 1, p.x))
      p.y = Math.max(0, Math.min(MAP_H - 1, p.y))
      p.stride += dt * (rider ? 6 : 11)
      p.heading = Math.atan2(iy, ix)
      p.facing = ix + iy > 0 ? 2 : ix - iy > 0 ? 1 : iy - ix > 0 ? 3 : 0
    }

    if (rider) {
      const v = vehicles.current.find((veh) => veh.kind === rider)
      if (v) {
        v.x = p.x
        v.y = p.y
        v.heading = p.heading
      }
    }

    // Sheep flee the player within a radius and drift otherwise — enough to
    // make herding them into the barn corner a real (gentle) activity.
    for (const s of sheep.current) {
      const dx = s.x - p.x
      const dy = s.y - p.y
      const dist = Math.hypot(dx, dy)
      if (dist < 2.6 && dist > 0.001) {
        const push = (2.6 - dist) * 1.9
        s.vx += (dx / dist) * push * dt
        s.vy += (dy / dist) * push * dt
      }
      s.vx += (Math.random() - 0.5) * 0.35 * dt
      s.vy += (Math.random() - 0.5) * 0.35 * dt
      s.vx *= 0.93
      s.vy *= 0.93
      const nx = s.x + s.vx * dt * 26
      const ny = s.y + s.vy * dt * 26
      if (!blocked(Math.round(nx), Math.round(s.y))) s.x = nx
      else s.vx = -s.vx * 0.4
      if (!blocked(Math.round(s.x), Math.round(ny))) s.y = ny
      else s.vy = -s.vy * 0.4
      s.x = Math.max(0.5, Math.min(MAP_W - 1.5, s.x))
      s.y = Math.max(0.5, Math.min(MAP_H - 1.5, s.y))
    }

    // Prompt text is React state, so only push it when it actually changes.
    const near = propNear(p.x, p.y)
    const vehicleNear = vehicles.current.find(
      (v) => Math.abs(v.x - p.x) + Math.abs(v.y - p.y) <= 1.8,
    )
    const next = ridingRef.current
      ? `E — get out of the ${VEHICLES[ridingRef.current].label.toLowerCase()}`
      : vehicleNear
        ? `E — drive the ${VEHICLES[vehicleNear.kind].label.toLowerCase()}`
        : near?.interact
          ? `E — ${near.interact.toLowerCase()}`
          : null
    if (next !== promptRef.current) {
      promptRef.current = next
      setPrompt(next)
      onPrompt?.(next)
    }
  }

  // ----------------------------------------------------------------- drawing

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number): void {
    const p = player.current

    // Sky gradient and haze, so the mountain has something to sit against.
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, "#8fb6c9")
    sky.addColorStop(0.55, "#c9d8d4")
    sky.addColorStop(1, "#e6e2d2")
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // Camera centres the player. Round the translation to whole pixels or the
    // isometric edges shimmer as you walk.
    const focus = toScreen(p.x, p.y, elevationAt(Math.round(p.x), Math.round(p.y)))
    const camX = Math.round(w / 2 - focus.sx)
    const camY = Math.round(h / 2 - focus.sy)

    ctx.save()
    ctx.translate(camX, camY)

    // Terrain, painted in depth order.
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const kind = terrain[y]![x]!
        const elev = elevationAt(x, y)
        const s = toScreen(x, y, elev)
        // Cheap frustum cull: the map is small, but this keeps the loop honest
        // if the map grows.
        if (s.sx + camX < -TILE_W || s.sx + camX > w + TILE_W) continue
        if (s.sy + camY < -TILE_H * 6 || s.sy + camY > h + TILE_H * 6) continue
        ctx.save()
        ctx.translate(s.sx, s.sy)
        // Drops to the two tiles that sit in front of this one on screen.
        const dropL = elev - elevationAt(x, y + 1)
        const dropR = elev - elevationAt(x + 1, y)
        drawTerrainTile(ctx, kind, phase + (x + y) * 0.4, dropL, dropR)
        ctx.restore()
      }
    }

    // Everything above ground sorted into one painter's-algorithm pass.
    type Item = { d: number; draw: () => void }
    const items: Item[] = []

    for (const prop of props) {
      const elev = elevationAt(prop.x, prop.y)
      const s = toScreen(prop.x, prop.y, elev)
      items.push({
        d: depth(prop.x, prop.y),
        draw: () => {
          ctx.save()
          ctx.translate(s.sx, s.sy)
          drawProp(ctx, prop.kind)
          ctx.restore()
        },
      })
    }

    for (const s of sheep.current) {
      const pos = toScreen(s.x, s.y, elevationAt(Math.round(s.x), Math.round(s.y)))
      items.push({
        d: depth(s.x, s.y),
        draw: () => {
          ctx.save()
          ctx.translate(pos.sx, pos.sy)
          drawSheep(ctx, phase * 3 + s.x)
          ctx.restore()
        },
      })
    }

    for (const v of vehicles.current) {
      if (ridingRef.current === v.kind) continue
      const pos = toScreen(v.x, v.y, elevationAt(Math.round(v.x), Math.round(v.y)))
      items.push({
        d: depth(v.x, v.y),
        draw: () => {
          ctx.save()
          ctx.translate(pos.sx, pos.sy)
          drawVehicle(ctx, v.kind, v.heading)
          ctx.restore()
        },
      })
    }

    const playerPos = toScreen(p.x, p.y, elevationAt(Math.round(p.x), Math.round(p.y)))
    items.push({
      d: depth(p.x, p.y) + 0.01,
      draw: () => {
        ctx.save()
        ctx.translate(playerPos.sx, playerPos.sy)
        if (ridingRef.current) drawVehicle(ctx, ridingRef.current, p.heading)
        else drawFarmer(ctx, p.facing, p.stride)
        ctx.restore()
      },
    })

    items.sort((a, b) => a.d - b.d)
    for (const item of items) item.draw()

    ctx.restore()
  }

  return (
    <div className="village-wrap">
      <canvas ref={canvasRef} className="village-canvas" />

      <div className="village-hud">
        <div className="village-hint">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
          <span>·</span>
          <kbd>Shift</kbd> run
          <span>·</span>
          <kbd>E</kbd> interact
        </div>
        {riding && <div className="village-riding">Driving the {VEHICLES[riding].label.toLowerCase()}</div>}
      </div>

      {prompt && <div className="village-prompt" role="status">{prompt}</div>}
      {notice && (
        <div className="village-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  )
}
