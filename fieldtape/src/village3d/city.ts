/**
 * Lucerne town — a real street grid, not a handful of scattered houses.
 *
 * Six named quarters on a grid of streets, with ~150 buildings of varying
 * height, colour and roof pitch, plus lamps, benches, fountains and a clock
 * tower.
 *
 * Everything is INSTANCED. A hundred and fifty buildings as separate Meshes is a
 * hundred and fifty draw calls before a single tree is drawn; as four
 * InstancedMeshes with per-instance colour it is four. That difference is the
 * whole reason a town this size runs at all on an integrated GPU.
 *
 * Deterministic: the town is a pure function of a fixed seed, so it is identical
 * for every player and ships as zero map data.
 */

import * as THREE from "three"
import { PAL } from "../art/palette"

/** Town centre in world coordinates, and half-extent of the built area. */
export const TOWN_X = 0
export const TOWN_Z = 4
export const TOWN_HALF = 46

/** Street spacing and width, in world units. */
const BLOCK = 16
const STREET = 6

/**
 * Minimum ground height for anything built.
 *
 * The town footprint is a square and the lake is a blob, so the south-west
 * corner of the grid overlaps the water — the first build put a dozen houses and
 * several streets out on the lake. Refusing to build below this height gives a
 * natural waterfront instead, with no special-casing of the shoreline.
 */
const BUILD_MIN_HEIGHT = 1.4

export interface Quarter {
  id: string
  name: string
  blurb: string
  x: number
  z: number
}

/** Named quarters, used for the district readout and the minimap. */
export const QUARTERS: Quarter[] = [
  { id: "altstadt", name: "Altstadt", blurb: "Old town. Narrow streets, painted fronts.", x: -14, z: -14 },
  { id: "markt", name: "Marktplatz", blurb: "The market square and the clock tower.", x: 2, z: 4 },
  { id: "seefeld", name: "Seefeld", blurb: "Lakeward terraces and the promenade.", x: -30, z: 26 },
  { id: "bahnhof", name: "Bahnhofviertel", blurb: "Station quarter. Warehouses and freight.", x: 28, z: -18 },
  { id: "handwerk", name: "Handwerk", blurb: "Workshops, kilns and the timber yard.", x: 26, z: 24 },
  { id: "hoehe", name: "Obere Höhe", blurb: "Upper slope. Quiet, expensive, good views.", x: -26, z: -30 },
]

function hash(x: number, z: number, salt: number): number {
  const n = Math.sin(x * 374.761 + z * 668.5 + salt * 91.7) * 43758.5453
  return n - Math.floor(n)
}

/**
 * True where a street runs.
 *
 * The grid is offset so the market square sits at an intersection rather than
 * inside a block, which is what makes the centre feel like a centre.
 */
export function isStreet(x: number, z: number): boolean {
  const lx = x - TOWN_X
  const lz = z - TOWN_Z
  if (Math.abs(lx) > TOWN_HALF || Math.abs(lz) > TOWN_HALF) return false
  const modX = Math.abs(((lx % BLOCK) + BLOCK) % BLOCK - BLOCK / 2)
  const modZ = Math.abs(((lz % BLOCK) + BLOCK) % BLOCK - BLOCK / 2)
  return modX < STREET / 2 || modZ < STREET / 2
}

export function inTown(x: number, z: number): boolean {
  return Math.abs(x - TOWN_X) <= TOWN_HALF && Math.abs(z - TOWN_Z) <= TOWN_HALF
}

/** Gabled roof geometry, unit-sized so instances can scale it. */
function unitRoof(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const v: number[] = []
  // Ridge runs along z. Unit footprint 1x1, apex at y=1.
  v.push(-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5)
  v.push(-0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5)
  v.push(-0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5)
  v.push(-0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5)
  v.push(0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5)
  v.push(0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5)
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3))
  g.computeVertexNormals()
  return g
}

const WALL_COLOURS = [
  "#dcd3bd", "#d8cdb2", "#e2d8c2", "#cfc3a6", "#d5cbb6",
  "#c9bda2", "#e6ddc9", "#c2b69b", "#dad0b8", "#cdbfa4",
]
const ROOF_COLOURS = [
  "#a9533c", "#8f4530", "#7f3b2b", "#9a4c36", "#6f4a3a",
  "#57707f", "#4a6270", "#8a4032",
]

export interface CityBuild {
  group: THREE.Group
  /** Circles that block movement. */
  blockers: Array<{ x: number; z: number; r: number }>
  /** World positions of lamp heads, for the night glow pass. */
  lamps: Array<{ x: number; z: number; y: number }>
  buildings: number
}

/**
 * @param groundAt terrain height sampler, so the town sits on the land.
 * @param avoid    keep-clear circles (existing landmarks) so nothing is buried.
 */
export function buildCity(
  groundAt: (x: number, z: number) => number,
  avoid: Array<{ x: number; z: number; r: number }>,
): CityBuild {
  const group = new THREE.Group()
  const blockers: Array<{ x: number; z: number; r: number }> = []
  const lamps: Array<{ x: number; z: number; y: number }> = []

  const wallMatrices: THREE.Matrix4[] = []
  const wallColours: THREE.Color[] = []
  const roofMatrices: THREE.Matrix4[] = []
  const roofColours: THREE.Color[] = []
  const lampPostMatrices: THREE.Matrix4[] = []
  const lampHeadMatrices: THREE.Matrix4[] = []

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()

  // ---------------------------------------------------------------- streets
  // One flat slab per street cell, merged into a single geometry: streets are
  // the largest surface in town and must not cost 400 draw calls.
  const streetGeoms: THREE.BufferGeometry[] = []
  const CELL = 2
  for (let z = TOWN_Z - TOWN_HALF; z <= TOWN_Z + TOWN_HALF; z += CELL) {
    for (let x = TOWN_X - TOWN_HALF; x <= TOWN_X + TOWN_HALF; x += CELL) {
      if (!isStreet(x, z)) continue
      const gy = groundAt(x, z)
      if (gy < BUILD_MIN_HEIGHT) continue
      const slab = new THREE.BoxGeometry(CELL, 0.18, CELL)
      slab.translate(x, gy + 0.09, z)
      streetGeoms.push(slab)
    }
  }
  if (streetGeoms.length > 0) {
    const merged = mergeGeometries(streetGeoms)
    const street = new THREE.Mesh(
      merged,
      new THREE.MeshLambertMaterial({ color: new THREE.Color("#b0a68e"), flatShading: true }),
    )
    street.receiveShadow = true
    group.add(street)
  }

  // -------------------------------------------------------------- buildings
  let buildings = 0
  // Plot spacing. Must exceed the widest building or neighbours interpenetrate.
  const step = 6
  for (let bz = TOWN_Z - TOWN_HALF; bz <= TOWN_Z + TOWN_HALF; bz += step) {
    for (let bx = TOWN_X - TOWN_HALF; bx <= TOWN_X + TOWN_HALF; bx += step) {
      if (isStreet(bx, bz)) continue

      const y = groundAt(bx, bz)
      // Waterfront: no building stands in the lake.
      if (y < BUILD_MIN_HEIGHT) continue

      const r1 = hash(bx, bz, 1)
      if (r1 > 0.8) continue // gaps: courtyards and gardens

      // Never build on top of a hand-placed landmark.
      if (avoid.some((a) => Math.hypot(a.x - bx, a.z - bz) < a.r + 3.2)) continue

      const distFromCentre = Math.hypot(bx - TOWN_X, bz - TOWN_Z)
      // Taller toward the middle, which is what makes a skyline read as a town.
      const tallness = 1 - Math.min(1, distFromCentre / TOWN_HALF)
      // Wide and low, with a big roof. The first pass made 2.6-wide footprints up
      // to five floors tall, which at ground level read as a forest of concrete
      // pillars rather than an alpine town — the silhouette of a Swiss townhouse
      // is broad, three storeys at most, and mostly roof.
      const floors = 1 + Math.floor(hash(bx, bz, 2) * 1.7 + tallness * 1.7)
      const h = floors * 2.7
      const w = 4.2 + hash(bx, bz, 3) * 1.4
      const d = 4.2 + hash(bx, bz, 4) * 1.4
      const rot = Math.round(hash(bx, bz, 5) * 3) * (Math.PI / 2)

      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)

      pos.set(bx, y + h / 2, bz)
      scl.set(w, h, d)
      wallMatrices.push(m.clone().compose(pos, q, scl))
      wallColours.push(
        new THREE.Color(WALL_COLOURS[Math.floor(hash(bx, bz, 6) * WALL_COLOURS.length)]!),
      )

      // Roof pitch is deliberately generous: on a low building the roof is the
      // silhouette.
      const roofH = 2.4 + hash(bx, bz, 7) * 1.8
      pos.set(bx, y + h, bz)
      scl.set(w + 1.1, roofH, d + 1.1)
      roofMatrices.push(m.clone().compose(pos, q, scl))
      roofColours.push(
        new THREE.Color(ROOF_COLOURS[Math.floor(hash(bx, bz, 8) * ROOF_COLOURS.length)]!),
      )

      blockers.push({ x: bx, z: bz, r: Math.max(w, d) * 0.62 })
      buildings += 1
    }
  }

  // ------------------------------------------------------------------ lamps
  // Along street centrelines at intervals, so the town lights up at night.
  for (let z = TOWN_Z - TOWN_HALF; z <= TOWN_Z + TOWN_HALF; z += BLOCK) {
    for (let x = TOWN_X - TOWN_HALF; x <= TOWN_X + TOWN_HALF; x += 8) {
      if (!isStreet(x, z)) continue
      const y = groundAt(x, z)
      if (y < BUILD_MIN_HEIGHT) continue
      q.identity()
      pos.set(x, y + 1.7, z)
      scl.set(1, 1, 1)
      lampPostMatrices.push(m.clone().compose(pos, q, scl))
      pos.set(x, y + 3.5, z)
      lampHeadMatrices.push(m.clone().compose(pos, q, scl))
      lamps.push({ x, z, y: y + 3.5 })
    }
  }

  const wallMesh = instanced(
    new THREE.BoxGeometry(1, 1, 1),
    wallMatrices,
    wallColours,
  )
  const roofMesh = instanced(unitRoof(), roofMatrices, roofColours)

  const lampPost = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.12, 3.4, 5),
    new THREE.MeshLambertMaterial({ color: new THREE.Color("#3a3a40"), flatShading: true }),
    Math.max(1, lampPostMatrices.length),
  )
  lampPostMatrices.forEach((mat, i) => lampPost.setMatrixAt(i, mat))
  lampPost.instanceMatrix.needsUpdate = true
  lampPost.castShadow = true
  lampPost.frustumCulled = false

  // Lamp heads are unlit basic material so they read as light sources, not
  // objects that happen to be pale.
  const lampHead = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.44, 0.34, 0.44),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.lamp) }),
    Math.max(1, lampHeadMatrices.length),
  )
  lampHeadMatrices.forEach((mat, i) => lampHead.setMatrixAt(i, mat))
  lampHead.instanceMatrix.needsUpdate = true
  lampHead.frustumCulled = false

  group.add(wallMesh, roofMesh, lampPost, lampHead)

  // ------------------------------------------------- market square landmarks
  const squareY = groundAt(TOWN_X, TOWN_Z)

  // Clock tower: the town's silhouette marker, visible from the ridge.
  const tower = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 22, 4.2),
    new THREE.MeshLambertMaterial({ color: new THREE.Color("#e2ded1"), flatShading: true }),
  )
  shaft.position.y = 11
  shaft.castShadow = true
  tower.add(shaft)
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.goldLight) }),
  )
  face.position.set(0, 17, 2.15)
  tower.add(face)
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 6, 4),
    new THREE.MeshLambertMaterial({ color: new THREE.Color("#57707f"), flatShading: true }),
  )
  cap.position.y = 25
  cap.castShadow = true
  tower.add(cap)
  tower.position.set(TOWN_X - 9, squareY, TOWN_Z - 9)
  group.add(tower)
  blockers.push({ x: TOWN_X - 9, z: TOWN_Z - 9, r: 2.8 })
  lamps.push({ x: TOWN_X - 9, z: TOWN_Z - 9, y: squareY + 17 })

  // Fountain.
  const fountain = new THREE.Group()
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.8, 0.8, 12),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.stone), flatShading: true }),
  )
  basin.position.y = 0.4
  basin.receiveShadow = true
  fountain.add(basin)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.2, 12),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.waterLight), flatShading: true }),
  )
  water.position.y = 0.8
  fountain.add(water)
  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.stoneLight), flatShading: true }),
  )
  spout.position.y = 1.6
  fountain.add(spout)
  fountain.position.set(TOWN_X + 4, squareY, TOWN_Z + 4)
  group.add(fountain)
  blockers.push({ x: TOWN_X + 4, z: TOWN_Z + 4, r: 2.9 })

  // Market stalls: striped awnings around the square.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2
    const sx = TOWN_X + 4 + Math.cos(angle) * 9
    const sz = TOWN_Z + 4 + Math.sin(angle) * 9
    if (isStreet(sx, sz)) continue
    const stall = new THREE.Group()
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.24, 2.4),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(i % 2 ? PAL.red : PAL.gold),
        flatShading: true,
      }),
    )
    top.position.y = 2.3
    top.castShadow = true
    stall.add(top)
    for (const [dx, dz] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]] as const) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.3, 0.12),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.timberDark), flatShading: true }),
      )
      leg.position.set(dx, 1.15, dz)
      stall.add(leg)
    }
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.16, 2.0),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL.timber), flatShading: true }),
    )
    table.position.y = 1.1
    stall.add(table)
    stall.position.set(sx, groundAt(sx, sz), sz)
    group.add(stall)
    blockers.push({ x: sx, z: sz, r: 1.7 })
  }

  return { group, blockers, lamps, buildings }
}

function instanced(
  geometry: THREE.BufferGeometry,
  matrices: THREE.Matrix4[],
  colours: THREE.Color[],
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshLambertMaterial({ flatShading: true }),
    Math.max(1, matrices.length),
  )
  matrices.forEach((mat, i) => {
    mesh.setMatrixAt(i, mat)
    mesh.setColorAt(i, colours[i] ?? new THREE.Color("#ffffff"))
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.castShadow = true
  mesh.receiveShadow = true
  // Instances are spread across the town; the geometry's own bounding sphere
  // would cull the whole mesh the moment the camera left the origin.
  mesh.frustumCulled = false
  return mesh
}

/** Minimal geometry merge — avoids pulling in the BufferGeometryUtils addon. */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let total = 0
  for (const g of geometries) total += g.getAttribute("position").count

  const position = new Float32Array(total * 3)
  const normal = new Float32Array(total * 3)
  let offset = 0
  for (const g of geometries) {
    const p = g.getAttribute("position") as THREE.BufferAttribute
    const n = g.getAttribute("normal") as THREE.BufferAttribute
    const indexed = g.getIndex()
    if (indexed) {
      // BoxGeometry is indexed; expand it so the merge stays index-free.
      for (let i = 0; i < indexed.count; i += 1) {
        const vi = indexed.getX(i)
        position[offset * 3] = p.getX(vi)
        position[offset * 3 + 1] = p.getY(vi)
        position[offset * 3 + 2] = p.getZ(vi)
        normal[offset * 3] = n.getX(vi)
        normal[offset * 3 + 1] = n.getY(vi)
        normal[offset * 3 + 2] = n.getZ(vi)
        offset += 1
      }
    } else {
      for (let i = 0; i < p.count; i += 1) {
        position[offset * 3] = p.getX(i)
        position[offset * 3 + 1] = p.getY(i)
        position[offset * 3 + 2] = p.getZ(i)
        normal[offset * 3] = n.getX(i)
        normal[offset * 3 + 1] = n.getY(i)
        normal[offset * 3 + 2] = n.getZ(i)
        offset += 1
      }
    }
    g.dispose()
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute("position", new THREE.BufferAttribute(position.subarray(0, offset * 3), 3))
  merged.setAttribute("normal", new THREE.BufferAttribute(normal.subarray(0, offset * 3), 3))
  return merged
}

/** Which quarter a position falls in, for the district readout. */
export function quarterAt(x: number, z: number): Quarter | null {
  if (!inTown(x, z)) return null
  let best: Quarter | null = null
  let bestDist = Infinity
  for (const qtr of QUARTERS) {
    const d = Math.hypot(qtr.x - x, qtr.z - z)
    if (d < bestDist) {
      best = qtr
      bestDist = d
    }
  }
  return best
}
