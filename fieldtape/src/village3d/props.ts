/**
 * Buildings, trees and landmarks for the 3D valley.
 *
 * Built from box and cone primitives with flat shading rather than imported
 * models: it keeps the payload at zero, matches the faceted terrain, and reads
 * correctly once the frame is downsampled to a low-resolution buffer, where a
 * detailed mesh would just turn to mush anyway.
 *
 * Vegetation is instanced. Nine hundred separate tree meshes would be nine
 * hundred draw calls; two InstancedMesh objects are two.
 */

import * as THREE from "three"
import { PAL } from "../art/palette"
import { HALF, groundAt, heightAt, regionAt } from "./terrain"

function mat(colour: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(colour), flatShading: true })
}

function box(
  w: number,
  h: number,
  d: number,
  colour: string,
  y = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colour))
  mesh.position.y = y + h / 2
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Steep gabled roof — the silhouette that reads as alpine at any distance. */
function gableRoof(w: number, d: number, h: number, colour: string, y: number): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  const hw = w / 2
  const hd = d / 2
  const v: number[] = []
  // Two sloping planes plus triangular gable ends.
  v.push(-hw, 0, -hd, hw, 0, -hd, 0, h, 0)
  v.push(-hw, 0, hd, 0, h, 0, hw, 0, hd)
  v.push(-hw, 0, -hd, 0, h, 0, -hw, 0, hd)
  v.push(hw, 0, -hd, hw, 0, hd, 0, h, 0)
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(v, 3))
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, mat(colour))
  mesh.castShadow = true
  mesh.position.y = y
  group.add(mesh)
  return group
}

export interface Landmark {
  id: string
  label: string
  /** Shown as an interaction prompt. */
  action: string
  x: number
  z: number
  /** Collision radius in world units. */
  radius: number
  shop?: "bakery" | "florist" | "barn"
  group: THREE.Group
}

function chalet(colour: string = PAL.plaster, roof: string = PAL.roofRed): THREE.Group {
  const g = new THREE.Group()
  g.add(box(4.4, 3.2, 3.8, colour))
  g.add(gableRoof(5.4, 4.8, 2.6, roof, 3.2))
  // Balcony rail.
  const rail = box(4.6, 0.3, 0.2, PAL.timberDark, 2.0)
  rail.position.z = 2.0
  g.add(rail)
  // Lit windows; emissive so they glow when the sun is down.
  for (const dx of [-1.2, 1.2]) {
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.9),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.lamp) }),
    )
    win.position.set(dx, 1.9, 1.92)
    g.add(win)
  }
  return g
}

function church(): THREE.Group {
  const g = new THREE.Group()
  g.add(box(4.6, 4.2, 6.4, PAL.plaster))
  g.add(gableRoof(5.4, 7.2, 2.2, "#57707f", 4.2))
  const tower = box(2.2, 8.4, 2.2, PAL.plaster)
  tower.position.z = -3.6
  g.add(tower)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 4), mat("#4a6270"))
  spire.position.set(0, 10.5, -3.6)
  spire.castShadow = true
  g.add(spire)
  const cross = box(0.16, 1.1, 0.16, PAL.gold, 12.5)
  cross.position.z = -3.6
  g.add(cross)
  return g
}

function barn(): THREE.Group {
  const g = new THREE.Group()
  g.add(box(6.2, 3.8, 4.6, "#8a4032"))
  g.add(gableRoof(7.2, 5.6, 3.0, "#5a3a2a", 3.8))
  const door = box(2.0, 2.4, 0.15, PAL.cream)
  door.position.z = 2.35
  g.add(door)
  return g
}

function shopFront(bodyColour: string, awning: string, roof: string): THREE.Group {
  const g = new THREE.Group()
  g.add(box(4.0, 3.0, 3.6, bodyColour))
  g.add(gableRoof(5.0, 4.6, 2.2, roof, 3.0))
  const canopy = box(4.4, 0.22, 1.4, awning, 2.2)
  canopy.position.z = 2.2
  g.add(canopy)
  const door = box(1.1, 1.9, 0.15, PAL.timberDark)
  door.position.z = 1.85
  g.add(door)
  return g
}

function well(): THREE.Group {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 8), mat(PAL.stone))
  ring.position.y = 0.5
  ring.castShadow = true
  g.add(ring)
  for (const dx of [-1.0, 1.0]) {
    const post = box(0.18, 2.4, 0.18, PAL.timberDark)
    post.position.x = dx
    g.add(post)
  }
  const roof = gableRoof(2.6, 1.8, 0.9, PAL.roofRedDark, 2.4)
  g.add(roof)
  return g
}

function jetty(): THREE.Group {
  const g = new THREE.Group()
  const deck = box(2.2, 0.2, 9.0, PAL.timber, 0.4)
  g.add(deck)
  for (let i = -4; i <= 4; i += 2) {
    const post = box(0.2, 1.6, 0.2, PAL.timberDark, -1.0)
    post.position.z = i
    g.add(post)
  }
  return g
}

function waterwheelMill(): THREE.Group {
  const g = new THREE.Group()
  g.add(box(3.6, 3.4, 3.2, "#c2ac86"))
  g.add(gableRoof(4.4, 4.0, 2.0, "#6b4430", 3.4))
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.5, 10), mat(PAL.timberDark))
  wheel.rotation.z = Math.PI / 2
  wheel.position.set(2.2, 1.6, 0)
  wheel.castShadow = true
  g.add(wheel)
  return g
}

function viewpoint(): THREE.Group {
  const g = new THREE.Group()
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 0.6, 8), mat(PAL.stone))
  plinth.position.y = 0.3
  g.add(plinth)
  for (const dx of [-1.1, 1.1]) {
    const post = box(0.16, 1.1, 0.16, PAL.timberDark, 0.6)
    post.position.x = dx
    g.add(post)
  }
  const rail = box(2.4, 0.14, 0.14, PAL.timber, 1.6)
  g.add(rail)
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.0, 6), mat(PAL.ink))
  scope.rotation.z = Math.PI / 2.6
  scope.position.set(0, 1.9, 0)
  g.add(scope)
  return g
}

/** Small stone cairn — a waymarker for the long walks. */
function cairn(): THREE.Group {
  const g = new THREE.Group()
  let y = 0
  for (const r of [0.9, 0.72, 0.55, 0.38]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(PAL.stone))
    stone.position.y = y + r * 0.6
    stone.castShadow = true
    g.add(stone)
    y += r * 1.05
  }
  return g
}

function alpineHut(): THREE.Group {
  const g = new THREE.Group()
  g.add(box(3.2, 2.2, 2.8, "#8a6a45"))
  g.add(gableRoof(4.0, 3.6, 1.8, "#4a4a4a", 2.2))
  const stack = box(0.4, 1.2, 0.4, PAL.stoneDark, 2.6)
  stack.position.x = 1.0
  g.add(stack)
  return g
}

function dairy(): THREE.Group {
  const g = new THREE.Group()
  g.add(box(5.0, 3.0, 4.0, "#d5d8c8"))
  g.add(gableRoof(6.0, 5.0, 2.2, "#7a5a3c", 3.0))
  for (let i = 0; i < 3; i += 1) {
    const churn = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 1.0, 8), mat(PAL.stoneLight))
    churn.position.set(-1.4 + i * 1.4, 0.5, 2.6)
    churn.castShadow = true
    g.add(churn)
  }
  return g
}

function stoneBridge(): THREE.Group {
  const g = new THREE.Group()
  const deck = box(5.0, 0.5, 14.0, PAL.stone, 1.4)
  g.add(deck)
  for (const z of [-4.5, 4.5]) {
    const pier = box(1.2, 3.0, 1.2, PAL.stoneDark)
    pier.position.z = z
    g.add(pier)
  }
  for (const dx of [-2.3, 2.3]) {
    const rail = box(0.3, 0.7, 14.0, PAL.stoneLight, 1.9)
    rail.position.x = dx
    g.add(rail)
  }
  return g
}

function quarry(): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 7; i += 1) {
    const r = 0.7 + (i % 3) * 0.5
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(i % 2 ? PAL.stone : PAL.stoneDark))
    rock.position.set(Math.cos(i * 2.1) * 3.4, r * 0.6, Math.sin(i * 1.7) * 3.4)
    rock.castShadow = true
    g.add(rock)
  }
  const cart = box(1.6, 0.9, 2.4, "#6b4430", 0.4)
  cart.position.set(3.2, 0, -2.6)
  g.add(cart)
  return g
}

function ruin(): THREE.Group {
  const g = new THREE.Group()
  // Broken walls at uneven heights read as ruin far better than a neat box.
  for (const [dx, dz, h] of [[-2, -2, 3.4], [2, -2, 1.6], [-2, 2, 2.4], [2, 2, 0.9]] as const) {
    const wall = box(1.0, h, 1.0, PAL.stoneLight)
    wall.position.set(dx, 0, dz)
    g.add(wall)
  }
  const arch = box(4.6, 0.7, 0.9, PAL.stone, 3.4)
  arch.position.z = -2
  g.add(arch)
  return g
}

function campfire(): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 6; i += 1) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), mat(PAL.stoneDark))
    stone.position.set(Math.cos(i * 1.05) * 1.1, 0.18, Math.sin(i * 1.05) * 1.1)
    g.add(stone)
  }
  for (let i = 0; i < 4; i += 1) {
    const log = box(0.18, 0.18, 1.4, PAL.timberDark, 0.25)
    log.rotation.y = i * 0.8
    g.add(log)
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.1, 5),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#f0913a") }),
  )
  flame.position.y = 0.9
  g.add(flame)
  return g
}

/** Landmarks, spread across the whole valley so travel has a purpose. */
export function buildLandmarks(): Landmark[] {
  const defs: Array<Omit<Landmark, "group"> & { make: () => THREE.Group }> = [
    // --- Village core
    { id: "chalet", label: "Your chalet", action: "go inside", x: -6, z: 14, radius: 3.4, make: () => chalet() },
    { id: "bakery", label: "The bakery", action: "step into the bakery", x: 8, z: 2, radius: 3.2, shop: "bakery", make: () => shopFront("#dcc9a3", PAL.gold, "#a9603c") },
    { id: "florist", label: "Blumen am See", action: "step into the flower shop", x: -4, z: -3, radius: 3.2, shop: "florist", make: () => shopFront("#d8dcc4", PAL.pink, "#5d8a5a") },
    { id: "church", label: "The chapel", action: "ring the bell", x: 16, z: 12, radius: 4.2, make: church },
    { id: "well", label: "The village well", action: "draw water", x: 2, z: 7, radius: 1.9, make: well },
    { id: "dairy", label: "The cheese dairy", action: "taste the alpkäse", x: -20, z: 2, radius: 3.6, make: dairy },

    // --- Farmland
    { id: "barn", label: "The barn", action: "step into the barn", x: 26, z: 28, radius: 4.2, shop: "barn", make: barn },
    { id: "orchard", label: "The orchard", action: "pick an apple", x: 54, z: -10, radius: 3.2, make: () => chalet("#cbb894", "#7d5a3c") },
    { id: "vineyard", label: "The vineyard hut", action: "rest in the shade", x: 30, z: 62, radius: 3.0, make: alpineHut },

    // --- Lakeside
    { id: "mill", label: "The old mill", action: "watch the wheel turn", x: -34, z: 40, radius: 3.2, make: waterwheelMill },
    { id: "jetty", label: "The jetty", action: "stand at the end of the jetty", x: -48, z: 58, radius: 2.6, make: jetty },
    { id: "bridge", label: "The stone bridge", action: "cross the bridge", x: -18, z: 46, radius: 4.0, make: stoneBridge },
    { id: "campfire", label: "Lakeside campfire", action: "sit by the fire", x: -66, z: 40, radius: 2.0, make: campfire },

    // --- Highland, a real climb away
    { id: "viewpoint", label: "Ridge viewpoint", action: "look out over the whole valley", x: -58, z: -52, radius: 2.6, make: viewpoint },
    { id: "tarn", label: "The high tarn", action: "look into the still water", x: -70, z: -66, radius: 2.4, make: cairn },
    { id: "hut", label: "The alpine hut", action: "shelter for a moment", x: -40, z: -70, radius: 3.0, make: alpineHut },
    { id: "ruin", label: "The old watchtower", action: "search the ruin", x: 44, z: -62, radius: 3.4, make: ruin },
    { id: "quarry", label: "The quarry", action: "look at the cut stone", x: 68, z: 36, radius: 3.8, make: quarry },
    { id: "cairn_east", label: "East waymarker", action: "add a stone to the cairn", x: 84, z: -18, radius: 1.8, make: cairn },
    { id: "cairn_south", label: "South waymarker", action: "add a stone to the cairn", x: -8, z: 92, radius: 1.8, make: cairn },
  ]

  return defs.map(({ make, ...rest }) => {
    const group = make()
    // Sink slightly so nothing floats over uneven ground.
    group.position.set(rest.x, groundAt(rest.x, rest.z) - 0.15, rest.z)
    return { ...rest, group }
  })
}

export interface Vegetation {
  conifers: THREE.InstancedMesh
  trunks: THREE.InstancedMesh
  broadleaf: THREE.InstancedMesh
  /** Positions with radius, for collision. */
  blockers: Array<{ x: number; z: number; r: number }>
}

/**
 * Scatter vegetation by region, avoiding the village and the water.
 *
 * Rejection sampling on a deterministic sequence: simple, and gives a natural
 * clumping that a uniform grid never does.
 */
export function buildVegetation(landmarks: Landmark[]): Vegetation {
  const conePositions: THREE.Matrix4[] = []
  const trunkPositions: THREE.Matrix4[] = []
  const leafPositions: THREE.Matrix4[] = []
  const blockers: Array<{ x: number; z: number; r: number }> = []

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3()
  const p = new THREE.Vector3()

  let seed = 1337
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  for (let i = 0; i < 26000; i += 1) {
    const x = (rand() * 2 - 1) * (HALF - 2)
    const z = (rand() * 2 - 1) * (HALF - 2)
    const region = regionAt(x, z)
    if (region === "lake" || region === "shore" || region === "village") continue

    const h = heightAt(x, z)
    if (h < 0.6) continue
    // Treeline: nothing grows on the snow.
    if (h > 56 && rand() > 0.1) continue

    // Keep clear of landmarks so buildings are never swallowed by forest.
    if (landmarks.some((l) => Math.hypot(l.x - x, l.z - z) < l.radius + 3.5)) continue

    const density =
      region === "forest"
        ? 0.7
        : region === "orchard" || region === "vineyard"
          ? 0.45
          : region === "highland"
            ? 0.3
            : region === "ridge"
              ? 0.14
              : 0.14
    if (rand() > density) continue

    const isConifer =
      region !== "orchard" && region !== "vineyard" && (region !== "meadow" || rand() < 0.72)
    const scale = 0.75 + rand() * 0.7

    if (isConifer) {
      p.set(x, h + 2.6 * scale, z)
      s.set(scale, scale, scale)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI)
      conePositions.push(m.clone().compose(p, q, s))
      p.set(x, h + 0.5 * scale, z)
      trunkPositions.push(m.clone().compose(p, q, s))
    } else {
      p.set(x, h + 1.9 * scale, z)
      s.set(scale, scale, scale)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI)
      leafPositions.push(m.clone().compose(p, q, s))
      p.set(x, h + 0.5 * scale, z)
      trunkPositions.push(m.clone().compose(p, q, s))
    }

    blockers.push({ x, z, r: 0.7 * scale })
  }

  const conifers = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.35, 5.2, 6),
    mat(PAL.pine),
    Math.max(1, conePositions.length),
  )
  const broadleaf = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1.6, 0),
    mat(PAL.grassDark),
    Math.max(1, leafPositions.length),
  )
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.2, 0.28, 1.6, 5),
    mat(PAL.timberDark),
    Math.max(1, trunkPositions.length),
  )

  conePositions.forEach((matrix, i) => conifers.setMatrixAt(i, matrix))
  leafPositions.forEach((matrix, i) => broadleaf.setMatrixAt(i, matrix))
  trunkPositions.forEach((matrix, i) => trunks.setMatrixAt(i, matrix))

  for (const mesh of [conifers, broadleaf, trunks]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.instanceMatrix.needsUpdate = true
    // Instanced meshes are scattered across the whole world; the default
    // bounding sphere is computed from the source geometry and would cull them.
    mesh.frustumCulled = false
  }

  return { conifers, trunks, broadleaf, blockers }
}

/** Simple farmer, built to read at low resolution: hat brim wider than body. */
export function buildFarmer(): THREE.Group {
  const g = new THREE.Group()
  const legs = box(0.5, 0.7, 0.32, "#3f5d8c")
  g.add(legs)
  const torso = box(0.62, 0.72, 0.4, "#d8dcc4", 0.7)
  g.add(torso)
  const head = box(0.42, 0.4, 0.4, "#e8c39a", 1.42)
  g.add(head)
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 8), mat("#d8ac54"))
  brim.position.y = 1.84
  brim.castShadow = true
  g.add(brim)
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.22, 8), mat("#c1922f"))
  crown.position.y = 1.95
  g.add(crown)
  return g
}

export function buildVehicle(kind: "tractor" | "pickup" | "cityCar"): THREE.Group {
  const g = new THREE.Group()
  const wheel = (r: number, x: number, z: number) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.28, 8), mat("#2b2118"))
    w.rotation.z = Math.PI / 2
    w.position.set(x, r, z)
    w.castShadow = true
    return w
  }
  if (kind === "tractor") {
    g.add(box(1.5, 0.7, 2.4, "#c0392b", 0.35))
    g.add(box(1.1, 0.8, 1.0, "#96271b", 1.05))
    g.add(wheel(0.72, -0.85, -0.7))
    g.add(wheel(0.72, 0.85, -0.7))
    g.add(wheel(0.42, -0.8, 1.0))
    g.add(wheel(0.42, 0.8, 1.0))
    g.add(box(0.22, 0.7, 0.22, "#3d2a20", 1.45))
  } else if (kind === "pickup") {
    g.add(box(1.7, 0.6, 4.0, "#3f6f8c", 0.5))
    g.add(box(1.5, 0.62, 1.6, "#33596f", 1.1))
    for (const z of [-1.3, 1.3]) {
      g.add(wheel(0.5, -0.9, z))
      g.add(wheel(0.5, 0.9, z))
    }
  } else {
    g.add(box(1.5, 0.55, 3.2, PAL.gold, 0.45))
    g.add(box(1.35, 0.5, 1.5, "#c98f22", 1.0))
    for (const z of [-1.0, 1.1]) {
      g.add(wheel(0.42, -0.78, z))
      g.add(wheel(0.42, 0.78, z))
    }
  }
  return g
}

/** Sheep: a woolly box and a dark head. Instantly legible from any angle. */
export function buildSheep(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), mat(PAL.cream))
  body.position.y = 0.62
  body.castShadow = true
  g.add(body)
  g.add(box(0.26, 0.26, 0.3, "#2b2118", 0.66))
  const head = g.children[g.children.length - 1] as THREE.Mesh
  head.position.z = 0.52
  for (const [dx, dz] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]] as const) {
    const leg = box(0.12, 0.35, 0.12, "#2b2118")
    leg.position.set(dx, 0.17, dz)
    g.add(leg)
  }
  return g
}
