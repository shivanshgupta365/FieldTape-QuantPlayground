/**
 * Shop interiors. Pressing E at a shop used to show a toast; now you go inside.
 *
 * The interior is drawn into the same low-resolution pixel buffer style as the
 * village so stepping through a door does not change art language. Layout is a
 * flat elevation rather than isometric — interiors are small and a straight-on
 * view reads better at this pixel density than a cramped diamond.
 */

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { PAL } from "../art/palette"

export type ShopId = "bakery" | "florist" | "barn"

export interface ShopItem {
  id: string
  name: string
  note: string
  price: number
}

interface ShopDef {
  title: string
  keeper: string
  greeting: string
  items: ShopItem[]
}

const SHOPS: Record<ShopId, ShopDef> = {
  bakery: {
    title: "The Village Bakery",
    keeper: "Frau Bühler",
    greeting: "Still warm. The rye came out well today.",
    items: [
      { id: "pretzel", name: "Butterbrezel", note: "Salt, butter, gone in four bites", price: 6 },
      { id: "rye", name: "Rye loaf", note: "Keeps for a week. Barely lasts a day", price: 14 },
      { id: "nusstorte", name: "Nusstorte", note: "Walnut and caramel. Worth the walk", price: 32 },
    ],
  },
  florist: {
    title: "Blumen am See",
    keeper: "Herr Kaufmann",
    greeting: "The gentians opened this morning. Take a look.",
    items: [
      { id: "edelweiss", name: "Edelweiss", note: "One stem. Grown, not picked", price: 18 },
      { id: "gentian", name: "Gentian posy", note: "That impossible blue", price: 12 },
      { id: "alpenrose", name: "Alpenrose bundle", note: "For the chalet windowsill", price: 24 },
    ],
  },
  barn: {
    title: "The Barn",
    keeper: "",
    greeting: "Straw, quiet, and the smell of warm animals.",
    items: [
      { id: "feed", name: "Sack of feed", note: "Keeps the flock content", price: 20 },
      { id: "bell", name: "Cowbell", note: "Genuinely deafening up close", price: 45 },
    ],
  },
}

/** Straight-on interior scene, drawn at low resolution and upscaled. */
function drawInterior(ctx: CanvasRenderingContext2D, shop: ShopId, w: number, h: number): void {
  const floorY = Math.round(h * 0.68)

  // Back wall with timber framing.
  ctx.fillStyle = shop === "barn" ? "#7d5a3c" : PAL.plaster
  ctx.fillRect(0, 0, w, floorY)
  ctx.fillStyle = shop === "barn" ? "#5b4029" : PAL.plasterShade
  for (let x = 6; x < w; x += 34) ctx.fillRect(x, 0, 3, floorY)
  ctx.fillRect(0, floorY - 4, w, 4)

  // Floorboards.
  ctx.fillStyle = PAL.timber
  ctx.fillRect(0, floorY, w, h - floorY)
  ctx.fillStyle = PAL.timberDark
  for (let y = floorY + 6; y < h; y += 7) ctx.fillRect(0, y, w, 1)

  // Window with the valley showing through — keeps the interior connected to
  // the outside rather than feeling like a separate screen.
  const wx = Math.round(w * 0.08)
  const wy = Math.round(h * 0.12)
  const ww = Math.round(w * 0.24)
  const wh = Math.round(h * 0.3)
  ctx.fillStyle = "#8fb6c9"
  ctx.fillRect(wx, wy, ww, wh)
  ctx.fillStyle = "#6d8c9c"
  ctx.fillRect(wx, wy + Math.round(wh * 0.5), ww, Math.round(wh * 0.2))
  ctx.fillStyle = PAL.grass
  ctx.fillRect(wx, wy + Math.round(wh * 0.7), ww, Math.round(wh * 0.3))
  ctx.fillStyle = PAL.timberDark
  ctx.fillRect(wx - 3, wy - 3, ww + 6, 3)
  ctx.fillRect(wx - 3, wy + wh, ww + 6, 3)
  ctx.fillRect(wx - 3, wy, 3, wh)
  ctx.fillRect(wx + ww, wy, 3, wh)
  ctx.fillRect(wx + Math.round(ww / 2), wy, 2, wh)

  // Counter.
  const cy = floorY - 26
  ctx.fillStyle = shop === "barn" ? "#6b4b30" : PAL.timber
  ctx.fillRect(Math.round(w * 0.3), cy, Math.round(w * 0.62), 26)
  ctx.fillStyle = PAL.timberDark
  ctx.fillRect(Math.round(w * 0.3), cy, Math.round(w * 0.62), 3)

  // Wares on the counter, keyed to the shop.
  const startX = Math.round(w * 0.34)
  if (shop === "bakery") {
    for (let i = 0; i < 5; i += 1) {
      const bx = startX + i * 22
      ctx.fillStyle = i % 2 ? "#c98f4f" : "#d8a866"
      ctx.fillRect(bx, cy - 9, 15, 9)
      ctx.fillStyle = "#a86f34"
      ctx.fillRect(bx + 2, cy - 9, 11, 2)
    }
    // Shelf of loaves behind.
    ctx.fillStyle = PAL.timberDark
    ctx.fillRect(Math.round(w * 0.42), Math.round(h * 0.2), Math.round(w * 0.46), 4)
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 ? "#b8813f" : "#cf9a55"
      ctx.fillRect(Math.round(w * 0.44) + i * 20, Math.round(h * 0.2) - 11, 14, 11)
    }
  } else if (shop === "florist") {
    const colours = [PAL.red, PAL.gold, PAL.pink, PAL.cream, "#7c8fd0", PAL.goldLight]
    for (let i = 0; i < 6; i += 1) {
      const bx = startX + i * 19
      ctx.fillStyle = "#6b6f57"
      ctx.fillRect(bx + 5, cy - 13, 3, 13)
      ctx.fillStyle = colours[i % colours.length]!
      ctx.fillRect(bx + 2, cy - 19, 9, 7)
      ctx.fillStyle = PAL.stemDark
      ctx.fillRect(bx, cy - 4, 13, 4)
    }
    // Hanging baskets.
    for (let i = 0; i < 3; i += 1) {
      const bx = Math.round(w * 0.46) + i * 40
      ctx.fillStyle = PAL.timberDark
      ctx.fillRect(bx + 6, 0, 2, 22)
      ctx.fillStyle = "#8a6a45"
      ctx.fillRect(bx, 22, 15, 8)
      ctx.fillStyle = PAL.pink
      ctx.fillRect(bx + 2, 18, 4, 4)
      ctx.fillStyle = PAL.gold
      ctx.fillRect(bx + 9, 19, 4, 4)
    }
  } else {
    // Barn: straw bales and tools.
    for (let i = 0; i < 3; i += 1) {
      const bx = startX + i * 34
      ctx.fillStyle = "#d8ac54"
      ctx.fillRect(bx, cy - 16, 26, 16)
      ctx.fillStyle = "#b78c38"
      ctx.fillRect(bx, cy - 11, 26, 2)
      ctx.fillRect(bx, cy - 6, 26, 2)
    }
    ctx.fillStyle = PAL.stoneDark
    ctx.fillRect(Math.round(w * 0.2), Math.round(h * 0.22), 3, 40)
    ctx.fillRect(Math.round(w * 0.2) - 7, Math.round(h * 0.22), 17, 4)
  }

  // Warm lamp pool over the counter.
  const glow = ctx.createRadialGradient(w * 0.6, cy - 30, 0, w * 0.6, cy - 30, w * 0.4)
  glow.addColorStop(0, "rgb(243 217 138 / 30%)")
  glow.addColorStop(1, "rgb(243 217 138 / 0%)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
}

const PIXEL = 3

export function ShopInterior({
  shop,
  coins,
  onBuy,
  onClose,
}: {
  shop: ShopId
  coins: number
  onBuy: (item: ShopItem) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [bought, setBought] = useState<string[]>([])
  const def = SHOPS[shop]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Escape and E both leave, so the key that opened it also closes it.
      if (event.key === "Escape" || event.key.toLowerCase() === "e") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const bw = Math.ceil(w / PIXEL)
    const bh = Math.ceil(h / PIXEL)

    const buffer = document.createElement("canvas")
    buffer.width = bw
    buffer.height = bh
    const bctx = buffer.getContext("2d")
    if (!bctx) return
    bctx.imageSmoothingEnabled = false
    drawInterior(bctx, shop, bw, bh)

    canvas.width = w
    canvas.height = h
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(buffer, 0, 0, bw, bh, 0, 0, w, h)
  }, [shop])

  return (
    <div className="shop-overlay" role="dialog" aria-modal="true" aria-label={def.title}>
      <div className="shop-panel">
        <header>
          <div>
            <span>{def.keeper || "Inside"}</span>
            <h2>{def.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Leave the shop">
            <X size={18} />
          </button>
        </header>

        <canvas ref={ref} className="shop-canvas" aria-hidden="true" />

        <p className="shop-greeting">“{def.greeting}”</p>

        <ul className="shop-items">
          {def.items.map((item) => {
            const owned = bought.includes(item.id)
            const affordable = coins >= item.price
            return (
              <li key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.note}</small>
                </span>
                <button
                  type="button"
                  disabled={owned || !affordable}
                  onClick={() => {
                    onBuy(item)
                    setBought((b) => [...b, item.id])
                  }}
                >
                  {owned ? "Bought" : affordable ? `¢${item.price}` : `¢${item.price} — short`}
                </button>
              </li>
            )
          })}
        </ul>

        <footer>
          <span>Purse ¢{coins.toLocaleString()}</span>
          <small>
            <kbd>E</kbd> or <kbd>Esc</kbd> to leave
          </small>
        </footer>
      </div>
    </div>
  )
}
