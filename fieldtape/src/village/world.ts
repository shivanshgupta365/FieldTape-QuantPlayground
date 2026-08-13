/**
 * Alpstead village — world model for the 2.5D map.
 *
 * Projection is true isometric (2:1 dimetric): screen x is (wx - wy) * TW/2 and
 * screen y is (wx + wy) * TH/2. Everything is drawn back-to-front by wx + wy,
 * which is what produces correct occlusion without a depth buffer.
 *
 * The map is data, not code. Terrain is a character grid so it can be edited by
 * hand, and props carry a world position plus a footprint so collision and draw
 * order fall out of the same numbers.
 */

export const TILE_W = 64
export const TILE_H = 32
/** Vertical pixels per unit of elevation. Tuned so terraces read as terraces. */
export const ELEV = 14

export type Terrain =
  | "grass"
  | "field"
  | "road"
  | "water"
  | "rock"
  | "snow"
  | "plaza"
  | "wood"

/**
 * Village layout. One character per tile.
 *
 *   . grass    f field    # road     ~ water
 *   ^ rock     * snow     o plaza    = wooden deck
 *
 * The lake sits south-west (Lake Lucerne), the mountain north-east (Pilatus),
 * the market plaza is central, and the player's farm is the field block east.
 */
const MAP = [
  "^^^***^^^^..........",
  "^^^^^^^^^..........~",
  "^^^^^^^..........~~~",
  "^^^^^...........~~~~",
  "^^^....####.....~~~~",
  "^.....#oooo#....~~~~",
  "......#oooo#.....~~~",
  ".....##oooo##.....~~",
  "....########.......~",
  "....#......#........",
  "....#.ffff.#........",
  "....#.ffff.#........",
  "....#.ffff.#........",
  "....#.ffff.#........",
  "....########........",
  "...........=........",
  "..........~~~.......",
  ".........~~~~~......",
  "........~~~~~~~.....",
  ".......~~~~~~~~~....",
]

const LEGEND: Record<string, Terrain> = {
  ".": "grass",
  f: "field",
  "#": "road",
  "~": "water",
  "^": "rock",
  "*": "snow",
  o: "plaza",
  "=": "wood",
}

export const MAP_H = MAP.length
export const MAP_W = MAP[0]!.length

export const terrain: Terrain[][] = MAP.map((row) =>
  [...row].map((ch) => LEGEND[ch] ?? "grass"),
)

/**
 * Smooth ridge rising to the north-east, so the massif reads as a mountain.
 *
 * The first version keyed height off tile type with a floor() step, which built
 * a staircase of equal-height cubes — the map looked like a grey office park,
 * not the Alps. Elevation is now a continuous function of distance from the
 * north-east corner, so adjacent tiles differ by small amounts and the silhouette
 * curves.
 */
export function elevationAt(x: number, y: number): number {
  const t = terrain[y]?.[x]
  if (t === "water") return -1
  if (t !== "rock" && t !== "snow") return 0
  // Distance from the far NE corner, normalised. Squared falloff gives a
  // shoulder near the base and a steeper summit.
  const dx = x / MAP_W
  const dy = y / MAP_H
  const toCorner = 1 - Math.min(1, Math.hypot(dx, dy) / 0.72)
  const ridge = Math.pow(Math.max(0, toCorner), 1.6)
  const base = t === "snow" ? 5.0 : 1.4
  // Micro-relief must be CONTINUOUS. A modulo-based jitter takes unrelated
  // values on neighbouring tiles, and since wall height is the drop between
  // neighbours, that alone rebuilds the staircase this function exists to
  // avoid. Overlapping sines vary smoothly in both axes.
  const relief =
    Math.sin(x * 0.55) * 0.35 + Math.sin(y * 0.48) * 0.3 + Math.sin((x + y) * 0.31) * 0.25
  return base + ridge * 5.5 + relief
}

export function walkable(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false
  const t = terrain[y]![x]!
  return t !== "water" && t !== "rock" && t !== "snow"
}

// ------------------------------------------------------------------- props ---

export type PropKind =
  | "chalet"
  | "bakery"
  | "florist"
  | "barn"
  | "church"
  | "well"
  | "tree"
  | "pine"
  | "fence"
  | "signpost"
  | "haybale"
  | "flowerbed"
  | "boat"

export interface VillageProp {
  kind: PropKind
  x: number
  y: number
  /** Blocks movement. Decorative props stay walkable so paths do not feel mean. */
  solid?: boolean
  label?: string
  /** Interior or interaction target, shown as a prompt when the player is near. */
  interact?: string
}

export const props: VillageProp[] = [
  { kind: "church", x: 7, y: 5, solid: true, label: "Chapel", interact: "Ring the bell" },
  { kind: "bakery", x: 9, y: 6, solid: true, label: "Bakery", interact: "Buy a pretzel" },
  { kind: "florist", x: 6, y: 7, solid: true, label: "Flower shop", interact: "Buy alpine flowers" },
  { kind: "well", x: 8, y: 7, solid: true, label: "Village well", interact: "Draw water" },
  { kind: "signpost", x: 8, y: 9, label: "Signpost", interact: "Read the notice board" },

  { kind: "chalet", x: 3, y: 10, solid: true, label: "Your chalet", interact: "Go inside" },
  { kind: "barn", x: 12, y: 12, solid: true, label: "Barn", interact: "Open the barn" },

  { kind: "boat", x: 11, y: 16, label: "Rowboat", interact: "Push out onto the lake" },

  { kind: "flowerbed", x: 5, y: 6 },
  { kind: "flowerbed", x: 10, y: 8 },
  { kind: "haybale", x: 13, y: 11 },
  { kind: "haybale", x: 14, y: 13 },

  { kind: "tree", x: 2, y: 6, solid: true },
  { kind: "tree", x: 15, y: 9, solid: true },
  { kind: "tree", x: 16, y: 12, solid: true },
  { kind: "tree", x: 4, y: 16, solid: true },
  { kind: "pine", x: 1, y: 4, solid: true },
  { kind: "pine", x: 3, y: 3, solid: true },
  { kind: "pine", x: 17, y: 6, solid: true },
  { kind: "pine", x: 18, y: 10, solid: true },
  { kind: "pine", x: 6, y: 18, solid: true },
]

const solidAt = new Set(
  props.filter((p) => p.solid).map((p) => `${p.x},${p.y}`),
)

export function blocked(x: number, y: number): boolean {
  return !walkable(x, y) || solidAt.has(`${x},${y}`)
}

export function propNear(x: number, y: number): VillageProp | null {
  let best: VillageProp | null = null
  let bestDist = Infinity
  for (const p of props) {
    if (!p.interact) continue
    const d = Math.abs(p.x - x) + Math.abs(p.y - y)
    if (d <= 1.6 && d < bestDist) {
      best = p
      bestDist = d
    }
  }
  return best
}

// ---------------------------------------------------------------- vehicles ---

export type VehicleKind = "tractor" | "pickup" | "cityCar"

export interface VehicleSpec {
  kind: VehicleKind
  label: string
  /** Tiles per second. The tractor is slow on purpose; it is the cosy one. */
  speed: number
  /** Radians per second of heading change. */
  turn: number
  /** Tractors cross ploughed fields; road cars do not. */
  offroad: boolean
}

export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  tractor: { kind: "tractor", label: "Tractor", speed: 2.1, turn: 2.4, offroad: true },
  pickup: { kind: "pickup", label: "Pickup", speed: 3.6, turn: 2.9, offroad: true },
  cityCar: { kind: "cityCar", label: "Little car", speed: 4.6, turn: 3.4, offroad: false },
}

export interface ParkedVehicle {
  kind: VehicleKind
  x: number
  y: number
  heading: number
}

export const parked: ParkedVehicle[] = [
  { kind: "tractor", x: 6, y: 11, heading: 0 },
  { kind: "pickup", x: 5, y: 9, heading: Math.PI / 2 },
  { kind: "cityCar", x: 10, y: 4, heading: Math.PI },
]

/** Vehicles refuse terrain their spec cannot handle, so driving has texture. */
export function driveable(spec: VehicleSpec, x: number, y: number): boolean {
  if (blocked(Math.round(x), Math.round(y))) return false
  const t = terrain[Math.round(y)]?.[Math.round(x)]
  if (!t) return false
  if (spec.offroad) return true
  return t === "road" || t === "plaza" || t === "wood"
}

// ------------------------------------------------------------- projection ---

export interface Screen {
  sx: number
  sy: number
}

export function toScreen(wx: number, wy: number, elev = 0): Screen {
  return {
    sx: (wx - wy) * (TILE_W / 2),
    sy: (wx + wy) * (TILE_H / 2) - elev * ELEV,
  }
}

/** Depth key. Larger draws later, i.e. in front. */
export function depth(wx: number, wy: number): number {
  return wx + wy
}
