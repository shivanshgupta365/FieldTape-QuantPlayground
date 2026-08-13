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

export const WORLD = 96
/** World units per terrain quad. Smaller = more triangles, chunkier silhouette. */
export const QUAD = 1
export const HALF = WORLD / 2

export type Region = "lake" | "shore" | "village" | "meadow" | "forest" | "orchard" | "ridge"

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
  const cx = -30
  const cz = 34
  const d = Math.hypot((x - cx) * 0.8, (z - cz) * 1.05)
  // Wobble the shoreline so it is not a circle.
  return d - (26 + fbm(x * 0.04, z * 0.04, 2) * 10)
}

export function regionAt(x: number, z: number): Region {
  const lake = lakeField(x, z)
  if (lake < -1.5) return "lake"
  if (lake < 2.5) return "shore"

  // Village core: a shallow bowl just inland of the lake.
  const vd = Math.hypot(x - 2, z - 6)
  if (vd < 15) return "village"

  const orch = Math.hypot(x - 26, z + 6)
  if (orch < 13) return "orchard"

  const h = heightAt(x, z)
  if (h > 15) return "ridge"
  if (h > 7.5) return "forest"
  return "meadow"
}

/** Terrain height in world units. */
export function heightAt(x: number, z: number): number {
  const lake = lakeField(x, z)

  // Lake bed: a basin, always below zero so water reads as filling a hollow.
  if (lake < 0) {
    const depth = Math.min(1, -lake / 22)
    return -1.2 - depth * 4.5
  }

  // Base slope rising to the north-east.
  const slope = (-x * 0.055 + -z * 0.075) * 2.4

  // Ridge mass, held off the village bowl.
  const ridge = Math.pow(Math.max(0, (-x - z) / 90 + 0.55), 2.1) * 34

  // Rolling detail.
  const roll = (fbm(x * 0.035, z * 0.035, 4) - 0.5) * 7
  const fine = (fbm(x * 0.12, z * 0.12, 2) - 0.5) * 1.4

  let h = 2 + slope + ridge + roll + fine

  // Flatten the village bowl so buildings sit level and streets are walkable.
  const vd = Math.hypot(x - 2, z - 6)
  if (vd < 18) {
    const flat = 1 - Math.min(1, vd / 18)
    h = h * (1 - flat * 0.88) + 2.6 * (flat * 0.88)
  }

  // Beach easing near the shoreline, so land does not meet water as a cliff.
  if (lake < 6) {
    const t = Math.max(0, lake) / 6
    h = h * t + (-0.6 + t * 1.2) * (1 - t)
  }

  // Terraced orchard: quantise height into steps.
  const od = Math.hypot(x - 26, z + 6)
  if (od < 14) {
    const blend = 1 - Math.min(1, od / 14)
    const stepped = Math.round(h / 2.2) * 2.2
    h = h * (1 - blend) + stepped * blend
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

  if (slope > 0.52) base.lerp(ROCK, Math.min(1, (slope - 0.52) / 0.4))
  if (height > 19) base.lerp(SNOW, Math.min(1, (height - 19) / 9))

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
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3))
  geometry.computeVertexNormals()

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
