import type { BoardTile } from "../components/GameBoard";
import type { CropKind } from "../components/CropGlyph";
import type { GameState, PlayerId, PublicFarmTile } from "../game";
import { selectPublicFarm } from "../game";

function tileCrop(tile: PublicFarmTile): CropKind {
  if (!tile.content) return "empty";
  if (tile.content.kind === "weed") return "weed";
  if (tile.content.kind === "animal") return tile.content.animal.toLowerCase() as CropKind;
  return tile.content.crop.toLowerCase() as CropKind;
}

export function boardTilesFromState(state: GameState, playerId: PlayerId, selectedId?: string): BoardTile[] {
  return selectPublicFarm(state, playerId).tiles.map((tile) => ({
    id: tile.id,
    x: tile.x,
    y: tile.y,
    crop: tileCrop(tile),
    growth: tile.content && "ageDays" in tile.content ? Math.min(3, Math.max(0, tile.content.ageDays)) : 1,
    watered: tile.content?.kind === "crop" ? tile.content.wateredToday : tile.content?.kind === "animal" ? tile.content.fedToday : true,
    locked: tile.locked,
    selected: selectedId === tile.id,
    urgent: tile.content?.kind === "crop" ? !tile.content.wateredToday && tile.content.ageDays > 0 : false,
  }));
}

