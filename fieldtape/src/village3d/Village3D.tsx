/**
 * Alpstead valley in pixelated 3D.
 *
 * Real 3D — perspective camera, directional sun, cast shadows, volume you can
 * walk around — rendered into a render target a quarter of the display size and
 * upscaled with a nearest-neighbour blit. That combination is the whole point:
 * genuine depth, but every edge lands on a chunky pixel grid so it belongs to
 * the same world as the farm board.
 *
 * Three deliberate choices that keep the pixel look honest:
 *  - No antialiasing on the renderer. AA fights the downsample and produces soft
 *    halos rather than hard pixel edges.
 *  - NearestFilter on the render target, both min and mag.
 *  - Flat shading everywhere. Smooth normals read as blurry at this resolution.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { DAY_PHASES } from "../art/palette"
import { ShopInterior, type ShopId, type ShopItem } from "../shops/ShopInterior"
import { HALF, buildTerrain, groundAt, inWater } from "./terrain"
import {
  buildFarmer,
  buildLandmarks,
  buildSheep,
  buildVegetation,
  buildVehicle,
  type Landmark,
} from "./props"

/** Display pixels per rendered pixel. 4 is chunky; 3 is crisper. */
const PIXEL = 4
const WALK = 7.5
const RUN = 15
const DRIVE: Record<string, number> = { tractor: 9, pickup: 16, cityCar: 22 }

interface VehicleState {
  kind: "tractor" | "pickup" | "cityCar"
  group: THREE.Group
  x: number
  z: number
  heading: number
}

export function Village3D() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [openShop, setOpenShop] = useState<ShopId | null>(null)
  const [purse, setPurse] = useState(140)
  const [phaseIndex, setPhaseIndex] = useState(2)
  const [visited, setVisited] = useState<string[]>([])

  const keys = useRef<Set<string>>(new Set())
  const phaseRef = useRef(2)
  const shopRef = useRef<ShopId | null>(null)
  const promptRef = useRef<string | null>(null)
  const interactRef = useRef<() => void>(() => {})

  useEffect(() => { phaseRef.current = phaseIndex }, [phaseIndex])
  useEffect(() => {
    shopRef.current = openShop
    if (openShop) keys.current.clear()
  }, [openShop])

  const onBuy = useCallback((item: ShopItem) => {
    setPurse((c) => Math.max(0, c - item.price))
    setNotice(`You bought ${item.name}.`)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ---------------------------------------------------------------- scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(52, 1, 0.5, 400)

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" })
    renderer.setPixelRatio(1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.BasicShadowMap
    mount.appendChild(renderer.domElement)
    renderer.domElement.className = "v3d-canvas"

    // Low-resolution target plus a fullscreen quad to blit it back up.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    })
    // Render targets default to a linear colour space. Blitting one through a
    // basic material therefore skips the sRGB encode the canvas would normally
    // apply, and the whole scene comes out roughly half as bright as intended —
    // it looks like a lighting bug but it is a colour-space bug.
    target.texture.colorSpace = THREE.SRGBColorSpace
    const blitScene = new THREE.Scene()
    const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const blitQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: target.texture }),
    )
    blitScene.add(blitQuad)

    // ------------------------------------------------------------ lighting
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 220
    const shadowSpan = 70
    sun.shadow.camera.left = -shadowSpan
    sun.shadow.camera.right = shadowSpan
    sun.shadow.camera.top = shadowSpan
    sun.shadow.camera.bottom = -shadowSpan
    scene.add(sun)
    scene.add(sun.target)

    const hemi = new THREE.HemisphereLight(0xd7e6ef, 0x6b7a52, 0.85)
    scene.add(hemi)

    // Flat ambient fill. Lambert plus a single directional light leaves every
    // shaded face almost black, which reads as murky rather than sunny; a small
    // constant term keeps the dark sides of buildings legible.
    const fill = new THREE.AmbientLight(0xffffff, 0.34)
    scene.add(fill)

    // -------------------------------------------------------------- content
    const { mesh: terrain, water } = buildTerrain()
    // Narrow once here: Mesh.material is Material | Material[], and the day
    // cycle needs the concrete colour property every frame.
    const waterMaterial = water.material as THREE.MeshLambertMaterial
    scene.add(terrain, water)

    const landmarks: Landmark[] = buildLandmarks()
    for (const l of landmarks) scene.add(l.group)

    const veg = buildVegetation(landmarks)
    scene.add(veg.conifers, veg.trunks, veg.broadleaf)

    const farmer = buildFarmer()
    scene.add(farmer)

    const vehicles: VehicleState[] = (
      [
        { kind: "tractor" as const, x: -8, z: 4 },
        { kind: "pickup" as const, x: 8, z: 12 },
        { kind: "cityCar" as const, x: 3, z: -6 },
      ]
    ).map(({ kind, x, z }) => {
      const group = buildVehicle(kind)
      group.position.set(x, groundAt(x, z), z)
      scene.add(group)
      return { kind, group, x, z, heading: 0 }
    })

    const sheep = Array.from({ length: 14 }, (_, i) => {
      const group = buildSheep()
      const x = 14 + Math.cos(i) * 7
      const z = 18 + Math.sin(i * 1.7) * 7
      group.position.set(x, groundAt(x, z), z)
      scene.add(group)
      return { group, x, z, vx: 0, vz: 0 }
    })

    // ---------------------------------------------------------------- state
    const player = { x: 0, z: 12, heading: 0, riding: null as string | null }
    // Camera orbit, player-controlled with Q/E or drag.
    const orbit = { yaw: Math.PI * 0.25, pitch: 0.42, distance: 24 }

    function blocked(x: number, z: number): boolean {
      if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return true
      if (inWater(x, z)) return true
      for (const l of landmarks) {
        if (Math.hypot(l.x - x, l.z - z) < l.radius) return true
      }
      for (const b of veg.blockers) {
        if (Math.hypot(b.x - x, b.z - z) < b.r) return true
      }
      return false
    }

    interactRef.current = () => {
      if (player.riding) {
        player.riding = null
        setNotice("You hop down.")
        return
      }
      const nearVehicle = vehicles.find(
        (v) => Math.hypot(v.x - player.x, v.z - player.z) < 3.2,
      )
      if (nearVehicle) {
        player.riding = nearVehicle.kind
        setNotice(`${nearVehicle.kind} — WASD to drive, E to get out.`)
        return
      }
      const near = landmarks.find(
        (l) => Math.hypot(l.x - player.x, l.z - player.z) < l.radius + 2.6,
      )
      if (!near) return
      setVisited((v) => (v.includes(near.id) ? v : [...v, near.id]))
      if (near.shop) {
        setOpenShop(near.shop)
        return
      }
      setNotice(`${near.label} — ${near.action}.`)
    }

    // ---------------------------------------------------------------- input
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const k = event.key.toLowerCase()
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        event.preventDefault()
      }
      if (k === "f") {
        interactRef.current()
        return
      }
      keys.current.add(k)
    }
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)

    let dragging = false
    let lastX = 0
    let lastY = 0
    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      orbit.yaw -= (e.clientX - lastX) * 0.006
      orbit.pitch = Math.max(0.18, Math.min(1.35, orbit.pitch + (e.clientY - lastY) * 0.005))
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = () => { dragging = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      orbit.distance = Math.max(6, Math.min(46, orbit.distance + Math.sign(e.deltaY) * 2))
    }
    renderer.domElement.addEventListener("pointerdown", onDown)
    renderer.domElement.addEventListener("pointermove", onMove)
    renderer.domElement.addEventListener("pointerup", onUp)
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false })

    // --------------------------------------------------------------- resize
    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      target.setSize(Math.max(1, Math.ceil(w / PIXEL)), Math.max(1, Math.ceil(h / PIXEL)))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    // ----------------------------------------------------------------- loop
    let raf = 0
    let last = performance.now()
    let running = true
    let clock = 0

    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      // Slow vertical bob on the water plane. Barely perceptible per frame, but
      // a completely static lake reads as glass.
      water.position.y = Math.sin(clock * 0.6) * 0.06

      if (!shopRef.current) stepWorld(dt)
      updateLighting()

      // Render the world small, then blit it up. Order matters: the target must
      // be cleared and drawn before it is sampled as a texture.
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(blitScene, blitCamera)

      raf = requestAnimationFrame(frame)
    }

    function stepWorld(dt: number): void {
      const k = keys.current

      // Camera-relative movement: forward is where the camera looks, which is
      // the only scheme that stays intuitive once the camera can orbit.
      let ix = 0
      let iz = 0
      if (k.has("w") || k.has("arrowup")) iz -= 1
      if (k.has("s") || k.has("arrowdown")) iz += 1
      if (k.has("a") || k.has("arrowleft")) ix -= 1
      if (k.has("d") || k.has("arrowright")) ix += 1
      if (k.has("q")) orbit.yaw += dt * 1.6
      if (k.has("e")) orbit.yaw -= dt * 1.6

      const mag = Math.hypot(ix, iz)
      const speed = player.riding
        ? DRIVE[player.riding]!
        : k.has("shift")
          ? RUN
          : WALK

      if (mag > 0) {
        ix /= mag
        iz /= mag
        const sin = Math.sin(orbit.yaw)
        const cos = Math.cos(orbit.yaw)
        const wx = ix * cos - iz * sin
        const wz = ix * sin + iz * cos

        const nx = player.x + wx * speed * dt
        const nz = player.z + wz * speed * dt
        // Separate axes so the player slides along obstacles instead of sticking.
        if (!blocked(nx, player.z)) player.x = nx
        if (!blocked(player.x, nz)) player.z = nz
        player.heading = Math.atan2(wx, wz)
      }

      const groundY = groundAt(player.x, player.z)

      if (player.riding) {
        const v = vehicles.find((veh) => veh.kind === player.riding)
        if (v) {
          v.x = player.x
          v.z = player.z
          v.heading = player.heading
          v.group.position.set(v.x, groundY, v.z)
          v.group.rotation.y = v.heading
        }
        farmer.visible = false
      } else {
        farmer.visible = true
        farmer.position.set(player.x, groundY, player.z)
        farmer.rotation.y = player.heading
      }

      // Sheep wander and shy away from the player.
      for (const s of sheep) {
        const dx = s.x - player.x
        const dz = s.z - player.z
        const d = Math.hypot(dx, dz)
        if (d < 6 && d > 0.01) {
          s.vx += (dx / d) * (6 - d) * dt * 1.4
          s.vz += (dz / d) * (6 - d) * dt * 1.4
        }
        s.vx += (Math.random() - 0.5) * dt * 1.6
        s.vz += (Math.random() - 0.5) * dt * 1.6
        s.vx *= 0.94
        s.vz *= 0.94
        const nx = s.x + s.vx * dt * 6
        const nz = s.z + s.vz * dt * 6
        if (!blocked(nx, s.z)) { s.x = nx } else { s.vx *= -0.5 }
        if (!blocked(s.x, nz)) { s.z = nz } else { s.vz *= -0.5 }
        s.group.position.set(s.x, groundAt(s.x, s.z), s.z)
        if (Math.hypot(s.vx, s.vz) > 0.05) s.group.rotation.y = Math.atan2(s.vx, s.vz)
      }

      // Third-person orbit camera. Lift the look-at point to chest height so the
      // horizon sits naturally rather than at the player's feet.
      const cx = player.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance
      const cz = player.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance
      const cy = groundY + Math.sin(orbit.pitch) * orbit.distance + 2.2
      // Only nudge the camera up enough to clear the ground it is over. Snapping
      // it to that ground plus a full clearance — which is what this did first —
      // launches it skyward whenever the orbit swings over the ridge, and the
      // view collapses to a near-vertical top-down.
      const clearance = groundAt(cx, cz) + 1.2
      camera.position.set(cx, cy < clearance ? clearance : cy, cz)
      camera.lookAt(player.x, groundY + 1.8, player.z)

      // Prompt, pushed to React only when it changes.
      const nearVehicle = vehicles.find(
        (v) => !player.riding && Math.hypot(v.x - player.x, v.z - player.z) < 3.2,
      )
      const near = landmarks.find(
        (l) => Math.hypot(l.x - player.x, l.z - player.z) < l.radius + 2.6,
      )
      const next = player.riding
        ? `F — get out of the ${player.riding}`
        : nearVehicle
          ? `F — drive the ${nearVehicle.kind}`
          : near
            ? `F — ${near.action}`
            : null
      if (next !== promptRef.current) {
        promptRef.current = next
        setPrompt(next)
      }
    }

    function updateLighting(): void {
      const phase = DAY_PHASES[phaseRef.current]!
      const t = phase.bodyX
      const elevation = Math.sin(t * Math.PI)

      sun.position.set(
        player.x + Math.cos(t * Math.PI) * 90,
        Math.max(6, elevation * 90),
        player.z - 40,
      )
      sun.target.position.set(player.x, 0, player.z)

      const night = phase.bodyIsMoon
      sun.intensity = night ? 0.22 : 1.5 + elevation * 0.9
      sun.color.set(night ? "#8fa8d8" : elevation < 0.45 ? "#ffc089" : "#fff8e8")

      // Hemisphere colour is deliberately NOT phase.sky[0]. Those are saturated
      // gradient stops, and using one as a fill light washes the whole valley
      // blue-grey at noon. A desaturated tint of it keeps the sun dominant.
      hemi.intensity = night ? 0.34 : 0.72
      hemi.color.set(night ? "#3a4a6a" : "#dbe8ef")
      hemi.groundColor.set(night ? "#1c2233" : "#6b7a52")
      fill.intensity = night ? 0.16 : 0.34

      scene.background = new THREE.Color(phase.sky[1])
      // Fog hides the world edge and gives distance weight. Kept far away so it
      // does not haze the village the player is standing in.
      scene.fog = new THREE.Fog(phase.sky[1], 78, 210)

      waterMaterial.color.set(night ? "#1d3448" : "#4d7f96")
    }

    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      renderer.domElement.removeEventListener("pointerdown", onDown)
      renderer.domElement.removeEventListener("pointermove", onMove)
      renderer.domElement.removeEventListener("pointerup", onUp)
      renderer.domElement.removeEventListener("wheel", onWheel)
      // WebGL contexts are a limited resource; leaking one per navigation will
      // eventually blank the canvas with no error.
      target.dispose()
      renderer.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose?.()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose?.()
      })
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  const total = 10

  return (
    <div className="v3d-wrap">
      <div className="v3d-mount" ref={mountRef} />

      <div className="v3d-hud">
        <div className="v3d-keys">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
          <span>·</span><kbd>Shift</kbd> run
          <span>·</span><kbd>F</kbd> interact
          <span>·</span><kbd>Q</kbd><kbd>E</kbd> turn
          <span>·</span>drag to look, scroll to zoom
        </div>
        <div className="v3d-time">
          <label>
            <span className="sr-only">Time of day</span>
            <input
              type="range"
              min={0}
              max={DAY_PHASES.length - 1}
              step={1}
              value={phaseIndex}
              onChange={(event) => setPhaseIndex(Number(event.target.value))}
            />
          </label>
          <b>{DAY_PHASES[phaseIndex]!.name}</b>
        </div>
        <div className="v3d-progress">
          Discovered {visited.length} / {total}
        </div>
      </div>

      {prompt && !openShop && <div className="v3d-prompt" role="status">{prompt}</div>}

      {notice && (
        <div className="v3d-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {openShop && (
        <ShopInterior
          shop={openShop}
          coins={purse}
          onBuy={onBuy}
          onClose={() => setOpenShop(null)}
        />
      )}
    </div>
  )
}
