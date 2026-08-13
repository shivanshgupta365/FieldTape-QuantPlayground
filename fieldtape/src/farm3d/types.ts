import type { AnimalId, CropId } from "../game/types"

/**
 * One plot, as the renderer needs it. Shared by the 3D board and the view
 * adapter in lib/gameView so the shape is declared once.
 */
export interface CanvasTile {
  id: string
  x: number
  y: number
  locked: boolean
  crop: CropId | null
  animal: AnimalId | null
  weed: boolean
  /** 0..3 growth stage; only meaningful when `crop` is set. */
  stage: number
  watered: boolean
  ready: boolean
}
