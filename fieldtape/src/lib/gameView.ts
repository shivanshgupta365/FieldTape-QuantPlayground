import type { CropId, GameState, PlayerId } from "../game";
import { CROP_SPECS, selectPublicFarm } from "../game";
import type { CanvasTile } from "../farm3d/types";

/**
 * Growth stage as a fraction of the crop's own maturity, not raw age.
 *
 * The older board clamped ageDays to 0..3, which drew a 4-day melon at the
 * same stage as a 4-day wheat even though wheat is finished by then and the
 * melon has six days to run. Scaling by firstYieldDay makes the sprite honest:
 * a melon visibly creeps through stages while wheat races.
 */
function cropStage(crop: CropId, ageDays: number, ready: boolean): number {
  if (ready) return 3;
  const first = Math.max(1, CROP_SPECS[crop].firstYieldDay);
  const progress = Math.max(0, Math.min(1, ageDays / first));
  if (progress < 0.34) return 0;
  if (progress < 0.7) return 1;
  return 2;
}

export function canvasTilesFromState(
  state: GameState,
  playerId: PlayerId,
): CanvasTile[] {
  return selectPublicFarm(state, playerId).tiles.map((tile) => {
    const content = tile.content;
    const isCrop = content?.kind === "crop";
    const isAnimal = content?.kind === "animal";
    return {
      id: tile.id,
      x: tile.x,
      y: tile.y,
      locked: tile.locked,
      crop: isCrop ? content.crop : null,
      animal: isAnimal ? content.animal : null,
      weed: content?.kind === "weed",
      stage: isCrop ? cropStage(content.crop, content.ageDays, content.ready) : 0,
      watered: isCrop ? content.wateredToday : isAnimal ? content.fedToday : true,
      ready: content && "ready" in content ? content.ready : false,
    };
  });
}


