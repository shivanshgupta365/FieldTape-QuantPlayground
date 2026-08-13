/**
 * Isometric art for the village, drawn as code like the farm atlas.
 *
 * Tiles are diamonds, not squares, so every surface is painted as a filled
 * parallelogram with a lit top face and two shaded side faces. The side faces
 * are what make the map read as 2.5D rather than a flat pattern — without them
 * elevation is invisible.
 */

import { ELEV, TILE_H, TILE_W, type PropKind, type Terrain, type VehicleKind } from "./world"

type Ctx = CanvasRenderingContext2D

const P = {
  grass: ["#6d9560", "#5b8050", "#456139"],
  field: ["#8a5a3c", "#734a31", "#553524"],
  road: ["#b3a68a", "#9a8e74", "#7a705a"],
  water: ["#4d7f96", "#3f6b80", "#2c4f60"],
  meadow: ["#7ba36b", "#63885a", "#4a6842"],
  plaza: ["#c8b795", "#ae9e7e", "#8b7d61"],
  wood: ["#9a6f43", "#835c36", "#634428"],
} as const satisfies Record<Terrain, readonly [string, string, string]>

/** Diamond top face centred on (0,0). */
function diamond(ctx: Ctx, fill: string): void {
  ctx.beginPath()
  ctx.moveTo(0, -TILE_H / 2)
  ctx.lineTo(TILE_W / 2, 0)
  ctx.lineTo(0, TILE_H / 2)
  ctx.lineTo(-TILE_W / 2, 0)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Exposed step faces, sized independently per side. */
function sidesStepped(
  ctx: Ctx,
  hLeft: number,
  hRight: number,
  left: string,
  right: string,
): void {
  // A minimum lip keeps flat ground from looking like paper.
  const l = Math.max(4, hLeft)
  const r = Math.max(4, hRight)

  ctx.beginPath()
  ctx.moveTo(-TILE_W / 2, 0)
  ctx.lineTo(0, TILE_H / 2)
  ctx.lineTo(0, TILE_H / 2 + l)
  ctx.lineTo(-TILE_W / 2, l)
  ctx.closePath()
  ctx.fillStyle = left
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(TILE_W / 2, 0)
  ctx.lineTo(0, TILE_H / 2)
  ctx.lineTo(0, TILE_H / 2 + r)
  ctx.lineTo(TILE_W / 2, r)
  ctx.closePath()
  ctx.fillStyle = right
  ctx.fill()
}

/**
 * @param dropLeft  Elevation drop to the tile in front-left, i.e. (x, y+1).
 * @param dropRight Elevation drop to the tile in front-right, i.e. (x+1, y).
 *
 * Walls are only as tall as the drop to the neighbour they face. Drawing each
 * tile's wall all the way to the ground — which is what this did first — turns
 * every tile into a free-standing cube, so a mountain renders as a grey office
 * park instead of a slope. Only the exposed step should be visible.
 */
export function drawTerrainTile(
  ctx: Ctx,
  kind: Terrain,
  phase: number,
  dropLeft: number,
  dropRight: number,
): void {
  const [top, left, right] = P[kind]
  sidesStepped(ctx, dropLeft * ELEV, dropRight * ELEV, left, right)

  if (kind === "water") {
    // Two offset diamonds with a slow phase shift: cheap, convincing ripple.
    diamond(ctx, top)
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.translate(0, Math.sin(phase) * 1.6)
    diamond(ctx, "#6d9fb2")
    ctx.restore()
    return
  }

  diamond(ctx, top)

  if (kind === "field") {
    // Furrows along the isometric grain, so ploughing follows the projection.
    ctx.strokeStyle = "#5f3d29"
    ctx.lineWidth = 1
    for (let i = -2; i <= 2; i += 1) {
      const o = i * 6
      ctx.beginPath()
      ctx.moveTo(-TILE_W / 2 + Math.abs(o), o * 0.5)
      ctx.lineTo(TILE_W / 2 - Math.abs(o), o * 0.5)
      ctx.stroke()
    }
  }

  if (kind === "grass" || kind === "meadow") {
    ctx.fillStyle = "#7fa871"
    for (const [dx, dy] of [[-12, 2], [8, -4], [2, 7], [16, 3]] as const) {
      ctx.fillRect(dx, dy, 2, 2)
    }
  }

  if (kind === "plaza") {
    ctx.strokeStyle = "#9c8c6c"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-TILE_W / 2, 0)
    ctx.lineTo(TILE_W / 2, 0)
    ctx.moveTo(0, -TILE_H / 2)
    ctx.lineTo(0, TILE_H / 2)
    ctx.stroke()
  }
}

// ------------------------------------------------------------------- props ---

function box(ctx: Ctx, w: number, d: number, h: number, top: string, l: string, r: string): void {
  const hw = (w * TILE_W) / 2
  const hd = (d * TILE_H) / 2
  // Left wall.
  ctx.beginPath()
  ctx.moveTo(-hw, 0)
  ctx.lineTo(0, hd)
  ctx.lineTo(0, hd - h)
  ctx.lineTo(-hw, -h)
  ctx.closePath()
  ctx.fillStyle = l
  ctx.fill()
  // Right wall.
  ctx.beginPath()
  ctx.moveTo(hw, 0)
  ctx.lineTo(0, hd)
  ctx.lineTo(0, hd - h)
  ctx.lineTo(hw, -h)
  ctx.closePath()
  ctx.fillStyle = r
  ctx.fill()
  // Roof plane.
  ctx.beginPath()
  ctx.moveTo(0, -hd - h)
  ctx.lineTo(hw, -h)
  ctx.lineTo(0, hd - h)
  ctx.lineTo(-hw, -h)
  ctx.closePath()
  ctx.fillStyle = top
  ctx.fill()
}

/** Steep alpine roof with deep eaves — the silhouette that says "Switzerland". */
function chaletRoof(ctx: Ctx, w: number, h: number, top: string, shade: string): void {
  const hw = (w * TILE_W) / 2 + 8
  ctx.beginPath()
  ctx.moveTo(-hw, -h)
  ctx.lineTo(0, -h - 26)
  ctx.lineTo(hw, -h)
  ctx.lineTo(0, -h + 16)
  ctx.closePath()
  ctx.fillStyle = top
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -h - 26)
  ctx.lineTo(hw, -h)
  ctx.lineTo(0, -h + 16)
  ctx.closePath()
  ctx.fillStyle = shade
  ctx.fill()
}

export function drawProp(ctx: Ctx, kind: PropKind): void {
  switch (kind) {
    case "chalet":
      box(ctx, 0.95, 0.95, 34, "#c49a6c", "#9b7448", "#835f39")
      chaletRoof(ctx, 1.0, 34, "#8c4a3a", "#743a2d")
      ctx.fillStyle = "#f3d98a"
      ctx.fillRect(-14, -26, 8, 8)
      ctx.fillRect(6, -24, 8, 8)
      break
    case "bakery":
      box(ctx, 0.9, 0.9, 32, "#dcc9a3", "#b8a382", "#9a866a")
      chaletRoof(ctx, 0.95, 32, "#a9603c", "#8d4c2e")
      ctx.fillStyle = "#e7a72f"
      ctx.fillRect(-16, -18, 32, 5) // awning
      ctx.fillStyle = "#6b4430"
      ctx.fillRect(-5, -14, 10, 14) // door
      break
    case "florist":
      box(ctx, 0.85, 0.85, 28, "#d8dcc4", "#b3b89c", "#949a7e")
      chaletRoof(ctx, 0.9, 28, "#5d8a5a", "#4a7048")
      for (const [dx, c] of [[-14, "#d85843"], [-6, "#e7a72f"], [3, "#d78ab4"], [12, "#f5f0e3"]] as const) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(dx, -6, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case "barn":
      box(ctx, 1.05, 1.0, 38, "#a8503f", "#8a4032", "#6f3226")
      chaletRoof(ctx, 1.1, 38, "#5a3a2a", "#472d20")
      // Two doors with diagonal bracing. A vertical plus a horizontal bar —
      // which is what this was — reads unmistakably as a medical cross.
      ctx.fillStyle = "#f2ede1"
      ctx.strokeStyle = "#f2ede1"
      ctx.lineWidth = 2.2
      ctx.fillRect(-14, -26, 12, 20)
      ctx.fillRect(2, -26, 12, 20)
      ctx.strokeStyle = "#8a4032"
      ctx.beginPath()
      ctx.moveTo(-14, -26); ctx.lineTo(-2, -6)
      ctx.moveTo(-2, -26); ctx.lineTo(-14, -6)
      ctx.moveTo(2, -26); ctx.lineTo(14, -6)
      ctx.moveTo(14, -26); ctx.lineTo(2, -6)
      ctx.stroke()
      break
    case "church":
      box(ctx, 0.8, 0.8, 40, "#e2ded1", "#c2beb0", "#a4a094")
      ctx.fillStyle = "#57707f"
      ctx.beginPath()
      ctx.moveTo(-13, -40)
      ctx.lineTo(0, -78)
      ctx.lineTo(13, -40)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = "#e7a72f"
      ctx.fillRect(-1.5, -86, 3, 10)
      ctx.fillRect(-5, -83, 10, 3)
      break
    case "well":
      ctx.fillStyle = "#8a8d86"
      ctx.beginPath()
      ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#5f6159"
      ctx.beginPath()
      ctx.ellipse(0, -2, 10, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#6b4430"
      ctx.fillRect(-11, -26, 3, 24)
      ctx.fillRect(8, -26, 3, 24)
      ctx.fillStyle = "#8c4a3a"
      ctx.fillRect(-15, -32, 30, 7)
      break
    case "tree":
      ctx.fillStyle = "#5b4029"
      ctx.fillRect(-2.5, -20, 5, 20)
      for (const [dy, r, c] of [[-24, 15, "#40663c"], [-31, 12, "#4d7a46"], [-37, 8, "#5d8f52"]] as const) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(0, dy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case "pine":
      ctx.fillStyle = "#4a3520"
      ctx.fillRect(-2, -14, 4, 14)
      for (const [dy, w, c] of [[-14, 17, "#2f5232"], [-26, 13, "#39603a"], [-37, 9, "#446e42"]] as const) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.moveTo(-w, dy)
        ctx.lineTo(0, dy - 17)
        ctx.lineTo(w, dy)
        ctx.closePath()
        ctx.fill()
      }
      break
    case "haybale":
      ctx.fillStyle = "#d8ac54"
      ctx.beginPath()
      ctx.ellipse(0, -8, 15, 11, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#b78c38"
      ctx.lineWidth = 1.5
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath()
        ctx.ellipse(0, -8, 15 - Math.abs(i) * 4, 11, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case "flowerbed":
      ctx.fillStyle = "#5a7f4e"
      ctx.beginPath()
      ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      for (const [dx, dy, c] of [
        [-11, -1, "#d85843"], [-4, 2, "#e7a72f"], [3, -2, "#d78ab4"],
        [10, 1, "#f5f0e3"], [-7, -4, "#c56ec0"], [7, -4, "#e9d45f"],
      ] as const) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(dx, dy - 4, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case "signpost":
      ctx.fillStyle = "#6b4430"
      ctx.fillRect(-1.5, -26, 3, 26)
      ctx.fillStyle = "#c49a6c"
      ctx.fillRect(-14, -26, 28, 9)
      ctx.fillStyle = "#3d2a20"
      ctx.fillRect(-10, -23, 20, 1.6)
      ctx.fillRect(-10, -20, 14, 1.6)
      break
    case "fence":
      ctx.fillStyle = "#8a6a45"
      ctx.fillRect(-TILE_W / 2, -12, TILE_W, 3)
      for (let i = -1; i <= 1; i += 1) ctx.fillRect(i * 20, -16, 3, 16)
      break
    case "boat":
      ctx.fillStyle = "#8a5a35"
      ctx.beginPath()
      ctx.ellipse(0, -3, 20, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#6b4430"
      ctx.beginPath()
      ctx.ellipse(0, -5, 15, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#c49a6c"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-4, -6)
      ctx.lineTo(18, -14)
      ctx.stroke()
      break
  }
}

// ------------------------------------------------------- actors + vehicles ---

/** Farmer, drawn facing one of four isometric directions. */
export function drawFarmer(ctx: Ctx, facing: number, stride: number): void {
  const back = facing === 0 || facing === 3
  const swing = Math.sin(stride) * 3

  ctx.fillStyle = "rgb(0 0 0 / 22%)"
  ctx.beginPath()
  ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#3f5d8c"
  ctx.fillRect(-5 + swing * 0.3, -14, 4, 14)
  ctx.fillRect(1 - swing * 0.3, -14, 4, 14)

  ctx.fillStyle = "#d8dcc4"
  ctx.fillRect(-6, -28, 12, 15)

  ctx.fillStyle = "#e8c39a"
  ctx.beginPath()
  ctx.arc(0, -33, 6, 0, Math.PI * 2)
  ctx.fill()

  // Straw hat, brim wider than the head so it reads at small sizes.
  ctx.fillStyle = "#d8ac54"
  ctx.beginPath()
  ctx.ellipse(0, -36, 11, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#c1922f"
  ctx.beginPath()
  ctx.ellipse(0, -39, 6, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  if (!back) {
    ctx.fillStyle = "#2b2118"
    ctx.fillRect(-3, -34, 1.6, 1.6)
    ctx.fillRect(1.4, -34, 1.6, 1.6)
  }
}

export function drawVehicle(ctx: Ctx, kind: VehicleKind, heading: number): void {
  ctx.fillStyle = "rgb(0 0 0 / 22%)"
  ctx.beginPath()
  ctx.ellipse(0, 2, 24, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  // Flip the body so the cab faces roughly along the heading. Four-way is
  // enough at this scale and avoids per-angle sprite work.
  const flip = Math.cos(heading) < 0 ? -1 : 1
  ctx.save()
  ctx.scale(flip, 1)

  if (kind === "tractor") {
    ctx.fillStyle = "#2b2118"
    ctx.beginPath()
    ctx.arc(-13, -6, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(14, -4, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#8f9a3e"
    ctx.beginPath()
    ctx.arc(-13, -6, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#c0392b"
    ctx.fillRect(-16, -22, 30, 13)
    ctx.fillStyle = "#96271b"
    ctx.fillRect(2, -30, 13, 10)
    ctx.fillStyle = "#f3d98a"
    ctx.fillRect(12, -27, 4, 4)
    ctx.fillStyle = "#3d2a20"
    ctx.fillRect(-13, -30, 3, 9)
  } else if (kind === "pickup") {
    ctx.fillStyle = "#2b2118"
    ctx.beginPath()
    ctx.arc(-14, -5, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(13, -5, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#3f6f8c"
    ctx.fillRect(-20, -19, 40, 12)
    ctx.fillStyle = "#33596f"
    ctx.fillRect(-18, -27, 18, 9)
    ctx.fillStyle = "#bcd7e2"
    ctx.fillRect(-15, -25, 12, 6)
    ctx.fillStyle = "#2c4a5c"
    ctx.fillRect(2, -22, 18, 4)
  } else {
    ctx.fillStyle = "#2b2118"
    ctx.beginPath()
    ctx.arc(-11, -5, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(11, -5, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#e7a72f"
    ctx.fillRect(-16, -17, 32, 11)
    ctx.fillStyle = "#c98f22"
    ctx.beginPath()
    ctx.moveTo(-10, -17)
    ctx.lineTo(-5, -26)
    ctx.lineTo(7, -26)
    ctx.lineTo(11, -17)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "#cfe3ea"
    ctx.fillRect(-5, -24, 11, 6)
  }
  ctx.restore()
}

/** Sheep the player can herd. Small, round, unmistakable. */
export function drawSheep(ctx: Ctx, stride: number): void {
  ctx.fillStyle = "rgb(0 0 0 / 20%)"
  ctx.beginPath()
  ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#2b2118"
  const swing = Math.sin(stride) * 1.5
  ctx.fillRect(-5 + swing, -6, 2, 6)
  ctx.fillRect(3 - swing, -6, 2, 6)
  ctx.fillStyle = "#f2ede1"
  ctx.beginPath()
  ctx.ellipse(0, -11, 11, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#2b2118"
  ctx.beginPath()
  ctx.ellipse(9, -13, 4.5, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#f2ede1"
  ctx.fillRect(11, -16, 3, 2)
}
