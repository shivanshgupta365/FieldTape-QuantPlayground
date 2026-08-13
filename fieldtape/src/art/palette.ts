/**
 * One palette for the whole game.
 *
 * The farm board and the village were drawn from two separate colour lists that
 * happened to be close but not equal, which is half of why the two screens
 * looked like different products. Both renderers now import from here, so a
 * colour can only be wrong in one place.
 *
 * Deliberately small. A tight palette is what makes disparate sprites read as
 * one world; every extra hue is another chance for two things to almost match.
 */

export const PAL = {
  // Earth
  soil: "#6b4430",
  soilDark: "#3d2a20",
  soilLight: "#835540",
  wet: "#33221a",
  wetRidge: "#4a3527",
  wetTrough: "#221610",

  // Growth
  grass: "#63895a",
  grassDark: "#4c6d46",
  grassLight: "#76a06a",
  stem: "#4f7a45",
  stemDark: "#3a5c33",
  pine: "#2f5232",
  pineDeep: "#1f4527",

  // Dry / stone
  scrub: "#8d9276",
  scrubDark: "#6f7359",
  scrubLight: "#a3a68a",
  stone: "#8a8578",
  stoneDark: "#5f5a4e",
  stoneLight: "#a8a394",

  // Water
  water: "#4d7f96",
  waterDark: "#33596f",
  waterLight: "#6d9fb2",

  // Snow / sky
  snow: "#eef1ef",
  snowShade: "#c3ced4",
  skyHigh: "#7ba8c4",
  skyLow: "#cfdcd8",

  // Accents
  gold: "#e7a72f",
  goldLight: "#f3c765",
  goldDark: "#b8842a",
  red: "#d85843",
  redDark: "#b23f2f",
  pink: "#d78ab4",
  orange: "#d9812f",

  // Neutrals
  cream: "#f5f0e3",
  paper: "#ece6d6",
  paperDeep: "#d8cfb9",
  ink: "#15140f",
  muted: "#625e53",

  // Built
  timber: "#8a5a35",
  timberDark: "#5b4029",
  plaster: "#dcd3bd",
  plasterShade: "#b8ad94",
  roofRed: "#a9533c",
  roofRedDark: "#7f3b2b",
  lamp: "#f3d98a",
} as const

export type PaletteKey = keyof typeof PAL

/**
 * Time-of-day tint applied over the finished frame.
 *
 * A single multiply/overlay pass is how a 2D scene gets a convincing day cycle
 * without re-authoring every sprite for every hour. Values are hand-picked per
 * phase rather than interpolated round a colour wheel, because the interesting
 * part of dusk is that it is warm at the horizon and cold overhead.
 */
export interface DayPhase {
  name: string
  /** Sky gradient, top to bottom. */
  sky: [string, string, string]
  /** Overlay colour and alpha applied to the whole scene. */
  tint: string
  tintAlpha: number
  /** Lit windows glow at night; suppressed at midday. */
  lampStrength: number
  /** Sun/moon position across the sky, 0..1 left to right. */
  bodyX: number
  bodyIsMoon: boolean
}

export const DAY_PHASES: DayPhase[] = [
  {
    name: "Dawn",
    sky: ["#4a5f80", "#c98f6f", "#e8d3b0"],
    tint: "#7a5c7f",
    tintAlpha: 0.22,
    lampStrength: 0.55,
    bodyX: 0.14,
    bodyIsMoon: false,
  },
  {
    name: "Morning",
    sky: ["#7ba8c4", "#b9d2d4", "#e2e4d4"],
    tint: "#fff3d0",
    tintAlpha: 0.07,
    lampStrength: 0.1,
    bodyX: 0.3,
    bodyIsMoon: false,
  },
  {
    name: "Midday",
    sky: ["#6fa1c6", "#a8c8d6", "#dfe3d6"],
    tint: "#ffffff",
    tintAlpha: 0.03,
    lampStrength: 0,
    bodyX: 0.5,
    bodyIsMoon: false,
  },
  {
    name: "Golden hour",
    sky: ["#5f86ad", "#e2a765", "#f0d3a4"],
    tint: "#ffb765",
    tintAlpha: 0.2,
    lampStrength: 0.25,
    bodyX: 0.72,
    bodyIsMoon: false,
  },
  {
    name: "Dusk",
    sky: ["#33405e", "#8a5f78", "#d59a76"],
    tint: "#5b4a80",
    tintAlpha: 0.3,
    lampStrength: 0.7,
    bodyX: 0.86,
    bodyIsMoon: false,
  },
  {
    name: "Night",
    sky: ["#131c33", "#233052", "#3c4a68"],
    tint: "#1b2a55",
    tintAlpha: 0.46,
    lampStrength: 1,
    bodyX: 0.35,
    bodyIsMoon: true,
  },
]
