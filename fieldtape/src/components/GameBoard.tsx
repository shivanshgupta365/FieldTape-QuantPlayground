import { Droplets, LockKeyhole, Sprout } from "lucide-react";
import { CropGlyph, type CropKind } from "./CropGlyph";

export type BoardTile = {
  id: string;
  x: number;
  y: number;
  crop: CropKind;
  growth: number;
  watered: boolean;
  locked?: boolean;
  worker?: "human" | "baseline";
  selected?: boolean;
  urgent?: boolean;
};

export function makeDemoTiles(side: "left" | "right" = "left", phase = 0): BoardTile[] {
  const crops: CropKind[] = ["wheat", "carrot", "tomato", "strawberry", "melon"];
  return Array.from({ length: 100 }, (_, index) => {
    const x = index % 10;
    const y = Math.floor(index / 10);
    const unlocked = x < 5 && y < 5;
    const planted = unlocked && ((x * 3 + y * 5 + (side === "left" ? 0 : 2)) % 7 < 4);
    const crop = planted ? crops[(x + y * 2 + phase) % crops.length]! : "empty";
    return {
      id: `${side}-${x}-${y}`,
      x,
      y,
      crop,
      growth: (x + y + phase) % 4,
      watered: planted && (x + phase) % 3 !== 0,
      locked: !unlocked,
      worker: x === (side === "left" ? 2 : 3) && y === (side === "left" ? 3 : 1) ? (side === "left" ? "human" : "baseline") : undefined,
    };
  });
}

export function GameBoard({
  label,
  player,
  coins,
  tiles,
  selectedId,
  onSelect,
  compact = false,
}: {
  label: string;
  player: string;
  coins: number;
  tiles: readonly BoardTile[];
  selectedId?: string;
  onSelect?: (tile: BoardTile) => void;
  compact?: boolean;
}) {
  return (
    <section className={compact ? "game-board compact" : "game-board"} aria-label={`${label} farm`}>
      <header className="board-header">
        <div><span>{label}</span><strong>{player}</strong></div>
        <div className="board-coins"><small>Bank</small><b>¢{coins.toLocaleString()}</b></div>
      </header>
      <div className="field-grid" role="grid" aria-label={`${player}'s 10 by 10 farm`}>
        {Array.from({ length: 10 }, (_, rowIndex) => (
          <div className="field-row" role="row" key={`row-${rowIndex + 1}`}>
            {tiles.slice(rowIndex * 10, rowIndex * 10 + 10).map((tile) => {
              const selected = selectedId === tile.id || tile.selected;
              return (
                <button
                  key={tile.id}
                  type="button"
                  role="gridcell"
                  className={`field-tile ${tile.locked ? "locked" : "unlocked"} ${tile.crop !== "empty" ? "planted" : ""} ${selected ? "selected" : ""} ${tile.urgent ? "urgent" : ""}`}
                  onClick={() => !tile.locked && onSelect?.(tile)}
                  disabled={tile.locked || !onSelect}
                  aria-label={tile.locked ? `Plot ${tile.x + 1}, ${tile.y + 1}, locked` : `Plot ${tile.x + 1}, ${tile.y + 1}, ${tile.crop}${tile.watered ? ", watered" : ""}`}
                  aria-selected={selected}
                >
                  {tile.locked ? <LockKeyhole className="tile-lock" size={10} /> : <span className="furrow" />}
                  <CropGlyph crop={tile.crop} stage={tile.growth} />
                  {tile.crop !== "empty" && !tile.watered && <Droplets className="dry-mark" size={9} />}
                  {tile.crop === "empty" && !tile.locked && <Sprout className="empty-mark" size={9} />}
                  {tile.worker && <span className={`worker-token ${tile.worker}`}><i /></span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <footer className="board-footer">
        <span><i className="legend-dot watered" /> watered</span>
        <span><i className="legend-dot dry" /> attention</span>
        <span>{tiles.filter((tile) => !tile.locked).length}/100 plots open</span>
      </footer>
    </section>
  );
}
