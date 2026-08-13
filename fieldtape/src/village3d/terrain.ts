/**
 * Alpstead valley — procedural 3D terrain.
 *
 * A 96x96 heightfield, roughly twenty-three times the area of the old 20x20
 * isometric map, laid out as distinct regions so there is somewhere to go rather
 * than just more of the same ground.
 *
 * Everything is a pure function of (x, z) plus a fixed seed, so the valley is
 * identical on every load and for every player without shipping a single byte of
 * map data.
 *
 * Flat shading throughout. Smooth normals fight the pixelated look — faceted
 * terrain is what makes low-resolution 3D read as deliberate rather than blurry.
 */

import * as THREE from "three"
import { PAL } from "../art/palette"

/**
 * Valley size in world units.
 *
 * 96 was too small to feel like a place: you crossed it in under a minute and
 * the far edge was always in view. At 256 the land is about seven times the area
 * and the horizon is genuinely distant.
 *
 * QUAD went 1 -> 2 to keep the triangle budget flat while the map grew: 128x128
 * quads instead of 96x96, so the mesh is barely larger despite covering seven
 * times the ground. Coarser quads also suit the pixel look.
 */
export const WORLD = 256
export const QUAD = 2
export const HALF = WORLD / 2

export type Region =
  | "lake"
  | "shore"
  | "village"
  | "meadow"
  | "forest"
  | "orchard"
  | "vineyard"
  | "highland"
  | "tarn"
  | "ridge"

/** Deterministic value noise. Cheap, seamless enough, no dependency. */
function hash2(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, z: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = x - xi
  const zf = z - zi
  // Smoothstep the interpolants; linear interpolation leaves visible grid creases.
  const u = xf * xf * (3 - 2 * xf)
  const v = zf * zf * (3 - 2 * zf)
  const a = hash2(xi, zi)
  const b = hash2(xi + 1, zi)
  const c = hash2(xi, zi + 1)
  const d = hash2(xi + 1, zi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i += 1) {
    sum += smoothNoise(x * freq, z * freq) * amp
    freq *= 2.07
    amp *= 0.5
  }
  return sum
}

/**
 * Signed distance from the lake centre, negative inside.
 *
 * The lake sits south-west so the tall ground is north-east, which puts the
 * sunset over the water from the village — the view worth walking to.
 */
function lakeField(x: number, z: number): number {
  const cx = -64
  const cz = 78
  const d = Math.hypot((x - cx) * 0.78, (z - cz) * 1.08)
  // Wobble the shoreline so it is not a circle.
  return d - (58 + fbm(x * 0.02, z * 0.02, 2) * 26)
}

/** A small high tarn, tucked behind the ridge as a reward for the climb. */
function tarnField(x: number, z: number): number {
  const d = Math.hypot((x + 78) * 1.0, (z + 74) * 1.1)
  return d - (15 + fbm(x * 0.05, z * 0.05, 2) * 5)
}

export function regionAt(x: number, z: number): Region {
  const lake = lakeField(x, z)
  if (lake < -1.5) return "lake"
  if (lake < 3.5) return "shore"

  const tarn = tarnField(x, z)
  if (tarn < 0) return "tarn"

  // Village core: a shallow bowl just inland of the lake.
  if (Math.hypot(x - 2, z - 6) < 22) return "village"
  if (Math.hypot(x - 54, z + 10) < 26) return "orchard"
  if (Math.hypot(x - 30, z + 62) < 28) return "vineyard"

  const h = heightAt(x, z)
  if (h > 40) return "ridge"
  if (h > 24) return "highland"
  if (h > 11) return "forest"
  return "meadow"
}

/** Terrain height in world units. */
export function heightAt(x: number, z: number): number {
  const lake = lakeField(x, z)

  // Lake bed: a basin, always below zero so water reads as filling a hollow.
  if (lake < 0) {
    const depth = Math.min(1, -lake / 48)
    return -1.4 - depth * 9
  }

  // Base slope rising to the north-east.
  const slope = (-x * 0.05 + -z * 0.07) * 1.5

  // Ridge mass, held off the village bowl. Much taller now that the map is big
  // enough for a climb to take a while.
  const ridge = Math.pow(Math.max(0, (-x - z) / 210 + 0.52), 2.0) * 96

  // Rolling detail at two frequencies.
  const roll = (fbm(x * 0.016, z * 0.016, 4) - 0.5) * 16
  const fine = (fbm(x * 0.07, z * 0.07, 2) - 0.5) * 2.4

  let h = 3 + slope + ridge + roll + fine

  // Flatten the village bowl so buildings sit level and streets are walkable.
  // Damped near the water: flattening the bowl to a fixed 3.0 right up to the
  // shoreline is what turned the lake edge into a vertical cliff.
  const vd = Math.hypot(x - 2, z - 6)
  if (vd < 26) {
    const shoreDamp = Math.min(1, Math.max(0, lake) / 26)
    const flat = (1 - Math.min(1, vd / 26)) * shoreDamp
    h = h * (1 - flat * 0.9) + 3.0 * (flat * 0.9)
  }

  // Beach easing. Wide, so land wades into the water instead of dropping in.
  if (lake < 26) {
    const t = Math.max(0, lake) / 26
    const eased = t * t * (3 - 2 * t)
    h = h * eased + (-1.0 + eased * 2.4) * (1 - eased)
  }

  // Terraced orchard and vineyard: quantise height into planting steps.
  for (const [ox, oz, r] of [[54, -10, 26], [30, 62, 28]] as const) {
    const od = Math.hypot(x - ox, z - oz)
    if (od < r) {
      const blend = 1 - Math.min(1, od / r)
      const stepped = Math.round(h / 3.0) * 3.0
      h = h * (1 - blend) + stepped * blend
    }
  }

  // Tarn basin: a shallow bowl carved into the highland.
  const tarn = tarnField(x, z)
  if (tarn < 8) {
    const blend = 1 - Math.max(0, tarn) / 8
    const bowl = 46 - Math.max(0, -tarn) * 0.4
    h = h * (1 - blend) + bowl * blend
  }

  return h
}

export const WATER_LEVEL = 0

const REGION_COLOUR: Record<Region, THREE.Color> = {
  lake: new THREE.Color(PAL.waterDark),
  shore: new THREE.Color("#c8b48a"),
  village: new THREE.Color(PAL.grass),
  meadow: new THREE.Color("#7ba36b"),
  forest: new THREE.Color(PAL.grassDark),
  orchard: new THREE.Color("#86a462"),
  vineyard: new THREE.Color("#94a05a"),
  highland: new THREE.Color("#7d8a63"),
  tarn: new THREE.Color("#4a8296"),
  ridge: new THREE.Color(PAL.stone),
}

const SNOW = new THREE.Color(PAL.snow)
const ROCK = new THREE.Color(PAL.stoneDark)

/**
 * Colour for one terrain face.
 *
 * Blended by height and slope rather than region alone: steep faces expose rock
 * and high ground takes snow, which is what makes the ridge read as a mountain
 * instead of a green lump.
 */
function faceColour(x: number, z: number, height: number, slope: number): THREE.Color {
  const base = REGION_COLOUR[regionAt(x, z)].clone()

  if (slope > 0.85) base.lerp(ROCK, Math.min(1, (slope - 0.85) / 0.7))
  if (height > 52) base.lerp(SNOW, Math.min(1, (height - 52) / 22))

  // Deterministic per-face jitter. Uniform colour over thousands of faces looks
  // like plastic; a couple of percent of variation reads as ground.
  const j = (hash2(Math.floor(x), Math.floor(z)) - 0.5) * 0.075
  base.offsetHSL(0, 0, j)
  return base
}

export interface TerrainBuild {
  mesh: THREE.Mesh
  water: THREE.Mesh
}

export function buildTerrain(): TerrainBuild {
  const segments = WORLD / QUAD
  const positions: number[] = []
  const colours: number[] = []
  const normals: number[] = []

  const c = new THREE.Color()

  for (let iz = 0; iz < segments; iz += 1) {
    for (let ix = 0; ix < segments; ix += 1) {
      const x0 = -HALF + ix * QUAD
      const z0 = -HALF + iz * QUAD
      const x1 = x0 + QUAD
      const z1 = z0 + QUAD

      const h00 = heightAt(x0, z0)
      const h10 = heightAt(x1, z0)
      const h01 = heightAt(x0, z1)
      const h11 = heightAt(x1, z1)

      // Slope from the corner spread; used for rock exposure.
      const slope =
        (Math.max(h00, h10, h01, h11) - Math.min(h00, h10, h01, h11)) / QUAD

      const cx = x0 + QUAD / 2
      const cz = z0 + QUAD / 2
      const mid = (h00 + h10 + h01 + h11) / 4

      c.copy(faceColour(cx, cz, mid, slope))

      // Two triangles per quad, flat-shaded: one colour for all six vertices of
      // the quad so faces stay crisp instead of gradient-blended.
      //
      // Winding is counter-clockwise when viewed from ABOVE, which is what makes
      // the computed normals point +Y. The obvious ordering (A, B, C going
      // left-right-then-back) produces a NEGATIVE Y normal, so every ground face
      // is back-facing and the entire terrain is culled — the scene renders as
      // props floating in fog with no ground at all.
      positions.push(x0, h00, z0, x0, h01, z1, x1, h10, z0)
      positions.push(x1, h10, z0, x0, h01, z1, x1, h11, z1)
      for (let k = 0; k < 6; k += 1) colours.push(c.r, c.g, c.b)

      // ONE normal for the whole quad, not one per triangle.
      //
      // computeVertexNormals with flatShading gives each triangle its own normal,
      // so the two halves of every quad catch the light differently and the whole
      // landscape develops a diagonal herringbone — it looks like corduroy, not
      // ground. Averaging the quad's plane and writing it to all six vertices
      // makes each quad a single flat facet, which is also the look we want.
      const nx = (h00 - h10) * QUAD
      const nz = (h00 - h01) * QUAD
      const ny = QUAD * QUAD
      const len = Math.hypot(nx, ny, nz) || 1
      for (let k = 0; k < 6; k += 1) normals.push(nx / len, ny / len, nz / len)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3))
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 1.6, WORLD * 1.6),
    new THREE.MeshLambertMaterial({
      color: new THREE.Color(PAL.water),
      transparent: true,
      // Nearly opaque on purpose. At 0.86 the lake bed showed through as dark
      // irregular blobs that read as rendering artefacts rather than depth.
      opacity: 0.96,
      flatShading: true,
    }),
  )
  water.rotation.x = -Math.PI / 2
  water.position.y = WATER_LEVEL
  water.receiveShadow = false

  return { mesh, water }
}

/** Ground height for the player, sampled from the same function as the mesh. */
export function groundAt(x: number, z: number): number {
  return heightAt(x, z)
}

export function inWater(x: number, z: number): boolean {
  return heightAt(x, z) < WATER_LEVEL - 0.35
}
