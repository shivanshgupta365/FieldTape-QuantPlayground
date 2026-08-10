import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

export function ReplayControls({
  turn,
  maxTurn = 720,
  playing,
  speed,
  onTurn,
  onToggle,
  onSpeed,
  onReset,
}: {
  turn: number;
  maxTurn?: number;
  playing: boolean;
  speed: number;
  onTurn: (turn: number) => void;
  onToggle: () => void;
  onSpeed: (speed: number) => void;
  onReset: () => void;
}) {
  const day = Math.min(30, Math.floor(turn / 24) + 1);
  const move = turn % 24;
  return (
    <section className="replay-controls" aria-label="Replay controls">
      <div className="transport">
        <button onClick={onReset} aria-label="Restart"><RotateCcw size={15} /></button>
        <button onClick={() => onTurn(Math.max(0, turn - 24))} aria-label="Previous day"><SkipBack size={15} /></button>
        <button onClick={() => onTurn(Math.max(0, turn - 1))} aria-label="Previous turn"><ChevronLeft size={17} /></button>
        <button className="play" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button onClick={() => onTurn(Math.min(maxTurn, turn + 1))} aria-label="Next turn"><ChevronRight size={17} /></button>
        <button onClick={() => onTurn(Math.min(maxTurn, turn + 24))} aria-label="Next day"><SkipForward size={15} /></button>
      </div>
      <div className="timeline">
        <input type="range" min="0" max={maxTurn} value={turn} onChange={(event) => onTurn(Number(event.target.value))} aria-label="Season timeline" />
        <div><span>Day {day.toString().padStart(2, "0")}</span><small>Turn {move.toString().padStart(2, "0")} / 24</small></div>
      </div>
      <div className="speed-control" aria-label="Playback speed">
        {[1, 4, 12].map((value) => <button key={value} className={speed === value ? "active" : undefined} onClick={() => onSpeed(value)}>{value}×</button>)}
      </div>
    </section>
  );
}

