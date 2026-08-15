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

import { Maximize2, Minimize2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { DAY_PHASES } from "../art/palette"
import { ShopInterior, type ShopId, type ShopItem } from "../shops/ShopInterior"
import { Minimap, type MinimapHandle } from "./Minimap"
import { buildCity, quarterAt } from "./city"
import { HALF, buildTerrain, groundAt, inWater } from "./terrain"
import {
  buildFarmer,
  buildHelicopter,
  buildLandmarks,
  buildSheep,
  buildVegetation,
  buildVehicle,
  buildVillager,
  type Landmark,
} from "./props"

/** Display pixels per rendered pixel. 4 is chunky; 3 is crisper. */
const PIXEL = 4
const WALK = 7.5
const RUN = 15
const DRIVE: Record<string, number> = { tractor: 9, pickup: 16, cityCar: 22, heli: 30 }
const LABEL: Record<string, string> = {
  tractor: "Tractor",
  pickup: "Pickup",
  cityCar: "Little car",
  heli: "Helicopter",
}
/** Vertical speed of the helicopter, world units per second. */
const CLIMB = 16
/** Ceiling. High enough to clear the summit with room to look down. */
const MAX_ALTITUDE = 190

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
  /** Mirrors player.riding for the HUD. The sim keeps its own mutable copy. */
  const [vehicle, setVehicle] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const districtRef = useRef<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const keys = useRef<Set<string>>(new Set())
  const phaseRef = useRef(2)
  const shopRef = useRef<ShopId | null>(null)
  const promptRef = useRef<string | null>(null)
  const interactRef = useRef<() => void>(() => {})
  const minimapRef = useRef<MinimapHandle | null>(null)
  const foundRef = useRef<Set<string>>(new Set())

  useEffect(() => { phaseRef.current = phaseIndex }, [phaseIndex])
  useEffect(() => {
    shopRef.current = openShop
    if (openShop) keys.current.clear()
  }, [openShop])

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    // Prefer the real Fullscreen API; the CSS fallback below covers browsers and
    // iframes that refuse it, so the button always does something.
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setFullscreen(false))
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => setFullscreen((v) => !v))
    } else {
      setFullscreen((v) => !v)
    }
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const onBuy = useCallback((item: ShopItem) => {
    setPurse((c) => Math.max(0, c - item.price))
    setNotice(`You bought ${item.name}.`)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ---------------------------------------------------------------- scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(56, 1, 0.5, 700)

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
    const shadowSpan = 90
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

    // Town before vegetation: the scatter needs the building footprints so trees
    // do not grow up through the roofs.
    const city = buildCity(
      groundAt,
      landmarks.map((l) => ({ x: l.x, z: l.z, r: l.radius })),
    )
    scene.add(city.group)

    const veg = buildVegetation([
      ...landmarks,
      ...city.blockers.map((b, i) => ({
        id: `city-${i}`,
        label: "",
        action: "",
        x: b.x,
        z: b.z,
        radius: b.r + 1.2,
        group: new THREE.Group(),
      })),
    ])
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

    // Helicopter: parked in the village, the only way onto the summit.
    const heli = buildHelicopter()
    // Parked on the village green a short walk from spawn: the helicopter is the
    // only route to the summit, so it must not be something you fail to find.
    const heliState = { x: 12, z: 34, heading: 0, altitude: 0 }
    heli.group.position.set(heliState.x, groundAt(heliState.x, heliState.z), heliState.z)
    scene.add(heli.group)

    /**
     * Villagers walking fixed loops.
     *
     * Routes are hand-placed rather than pathfound: the village is a known,
     * hand-built space, so a waypoint loop gives believable movement for a
     * fraction of the cost and cannot wander into the lake.
     */
    interface NpcDef {
      name: string
      shirt: string
      hat: string | null
      line: string
      /** Waypoint loop in world coordinates. */
      route: Array<[number, number]>
    }

    const NPC_DEFS: NpcDef[] = [
      { name: "Frau Bühler", shirt: "#d8dcc4", hat: "#d8ac54", line: "The rye came out well today.", route: [[12, 3], [3, 10], [12, 3]] },
      { name: "Herr Kaufmann", shirt: "#5d8a5a", hat: null, line: "The gentians opened this morning.", route: [[-6, -4], [2, 10], [-24, 3], [-6, -4]] },
      { name: "Old Anton", shirt: "#8a5a35", hat: "#6b4430", line: "Walked this path forty years. Still steep.", route: [[24, 18], [39, 42], [24, 18]] },
      { name: "Lena", shirt: "#c9563f", hat: null, line: "Racing you to the jetty. Losing.", route: [[-27, 36], [-51, 60], [-27, 36]] },
      { name: "The dairyman", shirt: "#dcd3bd", hat: "#a9533c", line: "Alpkäse needs eight months. No shortcuts.", route: [[-30, 3], [-18, 15], [-30, 3]] },
      { name: "Marta", shirt: "#d78ab4", hat: null, line: "Bread first, then the boat.", route: [[6, 12], [12, 3], [6, 12]] },
    ]

    const npcs = NPC_DEFS.map((def) => {
      const group = buildVillager(def.shirt, def.hat)
      const [sx, sz] = def.route[0]!
      group.position.set(sx, groundAt(sx, sz), sz)
      scene.add(group)
      return { ...def, group, x: sx, z: sz, leg: 0, t: 0 }
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
    const player = {
      x: 6,
      z: 30,
      heading: 0,
      riding: null as string | null,
      altitude: 0,
    }
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
      for (const b of city.blockers) {
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
      if (Math.hypot(heliState.x - player.x, heliState.z - player.z) < 5) {
        player.riding = "heli"
        player.altitude = Math.max(player.altitude, 0)
        setVehicle("Helicopter")
        setNotice("Helicopter — Space to climb, C to descend, WASD to fly. Land before you get out.")
        return
      }
      const nearVehicle = vehicles.find(
        (v) => Math.hypot(v.x - player.x, v.z - player.z) < 3.2,
      )
      if (nearVehicle) {
        player.riding = nearVehicle.kind
        setVehicle(LABEL[nearVehicle.kind] ?? nearVehicle.kind)
        setNotice(`${LABEL[nearVehicle.kind] ?? nearVehicle.kind} — WASD to drive, F to get out.`)
        return
      }
      // A villager within earshot takes priority over scenery.
      const villager = npcs.find(
        (n) => Math.hypot(n.x - player.x, n.z - player.z) < 3.4,
      )
      if (villager) {
        setNotice(`${villager.name}: “${villager.line}”`)
        return
      }

      const near = landmarks.find(
        (l) => Math.hypot(l.x - player.x, l.z - player.z) < l.radius + 2.6,
      )
      if (!near) return
      foundRef.current.add(near.id)
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
      orbit.distance = Math.max(7, Math.min(120, orbit.distance + Math.sign(e.deltaY) * 4))
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
    let minimapAccum = 0

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

      const flying = player.riding === "heli"
      if (flying) {
        if (k.has(" ")) player.altitude = Math.min(MAX_ALTITUDE, player.altitude + CLIMB * dt)
        if (k.has("c")) player.altitude = Math.max(0, player.altitude - CLIMB * dt)
      } else {
        player.altitude = 0
      }

      const mag = Math.hypot(ix, iz)
      const speed = player.riding
        ? DRIVE[player.riding]! * (k.has("shift") ? 1.5 : 1)
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
        if (flying) {
          // Nothing blocks in the air, but stay inside the world bounds.
          player.x = Math.max(-HALF + 3, Math.min(HALF - 3, nx))
          player.z = Math.max(-HALF + 3, Math.min(HALF - 3, nz))
        } else {
          // Separate axes so the player slides along obstacles instead of sticking.
          if (!blocked(nx, player.z)) player.x = nx
          if (!blocked(player.x, nz)) player.z = nz
        }
        player.heading = Math.atan2(wx, wz)
      }

      const groundY = groundAt(player.x, player.z)
      const flyY = groundY + player.altitude

      if (player.riding === "heli") {
        heliState.x = player.x
        heliState.z = player.z
        heliState.heading = player.heading
        heliState.altitude = player.altitude
        heli.group.position.set(player.x, flyY, player.z)
        heli.group.rotation.y = player.heading
        // Nose down slightly when moving, the universal visual cue for airspeed.
        heli.group.rotation.x = mag > 0 ? -0.13 : 0
        farmer.visible = false
      } else if (player.riding) {
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

      // Rotors spin whenever the player is aboard, and idle-spin down otherwise.
      const spin = player.riding === "heli" ? 26 : 0
      heli.rotor.rotation.y += spin * dt
      heli.tail.rotation.x += spin * 1.6 * dt

      // Villagers walk their loops.
      for (const npc of npcs) {
        const from = npc.route[npc.leg]!
        const to = npc.route[(npc.leg + 1) % npc.route.length]!
        const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
        npc.t += (dt * 2.2) / dist
        if (npc.t >= 1) {
          npc.t = 0
          npc.leg = (npc.leg + 1) % npc.route.length
        }
        npc.x = from[0] + (to[0] - from[0]) * npc.t
        npc.z = from[1] + (to[1] - from[1]) * npc.t
        npc.group.position.set(npc.x, groundAt(npc.x, npc.z), npc.z)
        npc.group.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1])
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
      // Pull the camera back with altitude, so the valley stays legible from
      // height instead of the helicopter filling the frame.
      const flightPullback = flying ? 1 + player.altitude / 90 : 1
      const dist = orbit.distance * flightPullback
      const cx = player.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * dist
      const cz = player.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * dist
      const cy = flyY + Math.sin(orbit.pitch) * dist + 2.2
      // Only nudge the camera up enough to clear the ground it is over. Snapping
      // it to that ground plus a full clearance — which is what this did first —
      // launches it skyward whenever the orbit swings over the ridge, and the
      // view collapses to a near-vertical top-down.
      const clearance = groundAt(cx, cz) + 1.2
      camera.position.set(cx, cy < clearance ? clearance : cy, cz)
      camera.lookAt(player.x, flyY + 1.8, player.z)

      // Prompt, pushed to React only when it changes.
      const nearVehicle = vehicles.find(
        (v) => !player.riding && Math.hypot(v.x - player.x, v.z - player.z) < 3.2,
      )
      const nearHeli =
        !player.riding && Math.hypot(heliState.x - player.x, heliState.z - player.z) < 5
      const nearNpc = npcs.find(
        (n) => !player.riding && Math.hypot(n.x - player.x, n.z - player.z) < 3.4,
      )
      const near = landmarks.find(
        (l) => Math.hypot(l.x - player.x, l.z - player.z) < l.radius + 2.6,
      )
      const next =
        player.riding === "heli"
          ? player.altitude > 2
            ? `Altitude ${Math.round(player.altitude)}m — C to descend`
            : "F — get out"
          : player.riding
            ? `F — get out of the ${player.riding}`
            : nearHeli
              ? "F — fly the helicopter"
              : nearVehicle
                ? `F — drive the ${nearVehicle.kind}`
                : nearNpc
                  ? `F — talk to ${nearNpc.name}`
                  : near
                    ? `F — ${near.action}`
                    : null
      if (next !== promptRef.current) {
        promptRef.current = next
        setPrompt(next)
      }

      // Minimap redraw is cheap but not free; a few times a second is plenty for
      // a map and keeps it off the per-frame budget.
      const here = quarterAt(player.x, player.z)
      const hereName = here ? `${here.name} — ${here.blurb}` : null
      if (hereName !== districtRef.current) {
        districtRef.current = hereName
        setDistrict(hereName)
      }

      minimapAccum += dt
      if (minimapAccum > 0.12) {
        minimapAccum = 0
        minimapRef.current?.update(
          { x: player.x, z: player.z, heading: orbit.yaw },
          landmarks.map((l) => ({ x: l.x, z: l.z, found: foundRef.current.has(l.id) })),
        )
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
      scene.fog = new THREE.Fog(phase.sky[1], 130, 420)

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

  const total = 25

  return (
    <div className={`v3d-wrap${fullscreen ? " is-fullscreen" : ""}`} ref={wrapRef}>
      <div className="v3d-mount" ref={mountRef} />

      <button
        type="button"
        className="v3d-fullscreen"
        onClick={toggleFullscreen}
        aria-pressed={fullscreen}
      >
        {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        {fullscreen ? "Exit full screen" : "Full screen"}
      </button>

      <div className="v3d-hud">
        <div className="v3d-keys">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
          <span>·</span><kbd>Shift</kbd> run
          <span>·</span><kbd>F</kbd> interact
          <span>·</span><kbd>Q</kbd><kbd>E</kbd> turn
          <span>·</span><kbd>Space</kbd><kbd>C</kbd> fly
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
        {vehicle && <div className="v3d-vehicle">{vehicle}</div>}
        {district && <div className="v3d-district">{district}</div>}
        <Minimap handleRef={minimapRef} />
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
