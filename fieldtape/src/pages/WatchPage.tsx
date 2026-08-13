import { Download, Eye, Flag, Radio, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FarmCanvas } from "../render/FarmCanvas";
import { LineChart } from "../components/LineChart";
import { MarketTape, type MarketQuote } from "../components/MarketTape";
import { ReplayControls } from "../components/ReplayControls";
import {
  CROP_IDS,
  generateDemoReplay,
  replayStateAt,
  selectClock,
  selectMarketTape,
  selectScoreboard,
  serializePublicReplay,
  stepGame,
  type CropId,
  type GameState,
} from "../game";
import { canvasTilesFromState } from "../lib/gameView";

const symbols: Record<string, string> = { WHEAT: "WHT", CARROT: "CRT", TOMATO: "TOM", STRAWBERRY: "STR", MELON: "MLN" };
const quoteView = (state: GameState): MarketQuote[] => selectMarketTape(state).filter((row) => CROP_IDS.includes(row.product as CropId)).map((row) => ({ symbol: symbols[row.product]!, label: row.product, price: row.price, change: row.changePct * 100 }));

export function WatchPage() {
  const replay = useMemo(() => generateDemoReplay("fieldtape-launch-match", ["steady", "risk"]), []);
  const [turn, setTurn] = useState(0);
  const [state, setState] = useState(() => replayStateAt(replay, 0));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const stateRef = useRef(state);
  stateRef.current = state;
  const score = selectScoreboard(state);
  const clock = selectClock(state);
  const events = useMemo(() => replay.turns.flatMap((frame) => frame.events).filter((event) => event.importance >= 2), [replay]);
  const nearbyEvents = events.filter((event) => Math.abs(event.turn - turn) < 70).slice(-7).reverse();
  const curveA = replay.checkpoints.map((point) => point.snapshot.farms[0].money);
  const curveB = replay.checkpoints.map((point) => point.snapshot.farms[1].money);

  const seek = useCallback((target: number) => {
    const bounded = Math.max(0, Math.min(replay.turns.length, Math.floor(target)));
    const current = stateRef.current;
    if (bounded === current.turn + 1 && current.status === "running") {
      const frame = replay.turns[current.turn]!;
      const next = stepGame(current, { 0: frame.actions[0], 1: frame.actions[1] });
      setState(next);
    } else setState(replayStateAt(replay, bounded));
    setTurn(bounded);
    if (bounded >= replay.turns.length) setPlaying(false);
  }, [replay]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => seek(turn + 1), Math.max(35, 380 / speed));
    return () => window.clearInterval(interval);
  }, [playing, seek, speed, turn]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([serializePublicReplay(replay, true)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${replay.id}.json`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="watch-page">
      <header className="watch-header">
        <div><p className="eyebrow"><Radio size={12} /> SPECTATOR / SYNTHETIC PUBLIC MATCH</p><h1>Duration vs. variance</h1><span>{replay.players[0].baseline} baseline against {replay.players[1].baseline} baseline · deterministic seed</span></div>
        <div className="watch-score"><section><span>{state.farms[0].name}</span><b>¢{state.farms[0].money.toLocaleString()}</b><small>stock MTM ¢{score[0].estimatedStockValue}</small></section><i>VS</i><section><span>{state.farms[1].name}</span><b>¢{state.farms[1].money.toLocaleString()}</b><small>stock MTM ¢{score[1].estimatedStockValue}</small></section></div>
      </header>

      <MarketTape quotes={quoteView(state)} />

      <div className="spectator-stage">
        <div className="spectator-farms"><section className="farm-shell" aria-label="Farm A"><header><div><span>Farm A / low variance</span><strong>{state.farms[0].name}</strong></div><div className="farm-bank"><span>Bank</span><b>¢{state.farms[0].money.toLocaleString()}</b></div></header><FarmCanvas label={state.farms[0].name} tiles={canvasTilesFromState(state, 0)} scale={2} /></section><div className="town-spine"><span>TOWN TAPE</span><b>DAY {clock.displayDay.toString().padStart(2, "0")}</b><div className="town-buildings">{state.town.unlockedShops.slice(0, 6).map((shop) => <i key={shop} title={shop}>{shop.slice(0, 1)}</i>)}</div><em>{state.town.unlockedShops.length} / 8 shops open</em></div><section className="farm-shell" aria-label="Farm B"><header><div><span>Farm B / convex harvest</span><strong>{state.farms[1].name}</strong></div><div className="farm-bank"><span>Bank</span><b>¢{state.farms[1].money.toLocaleString()}</b></div></header><FarmCanvas label={state.farms[1].name} tiles={canvasTilesFromState(state, 1)} scale={2} /></section></div>
        <div className="lead-watermark"><span>BANK LEAD</span><strong className={score[0].lead >= 0 ? "cyan" : "gold"}>{score[0].lead >= 0 ? state.farms[0].name : state.farms[1].name}<b> {Math.abs(score[0].lead).toLocaleString()}¢</b></strong></div>
      </div>

      <ReplayControls turn={turn} maxTurn={replay.turns.length} playing={playing} speed={speed} onTurn={seek} onToggle={() => setPlaying((value) => !value)} onSpeed={setSpeed} onReset={() => { seek(0); setPlaying(false); }} />

      <div className="watch-diagnostics">
        <section className="watch-curve"><header><span>BANK CURVE / DAILY CLOSE</span><b>{Math.round(clock.progress * 100)}% OF SEASON</b></header><LineChart height={180} marker={clock.progress} series={[{ label: replay.players[0].name, color: "#41b7ba", values: curveA }, { label: replay.players[1].name, color: "#e7a72f", values: curveB }]} /></section>
        <section className="event-tape"><header><span>EVENT JUMPS</span><small>importance ≥ 2</small></header>{nearbyEvents.length ? nearbyEvents.map((event) => <button key={event.id} onClick={() => seek(event.turn)} className={Math.abs(event.turn - turn) < 2 ? "active" : undefined}><i>{event.kind === "lead-change" ? <Flag size={12} /> : <Sparkles size={12} />}</i><span><b>D{String(Math.min(30, event.day + 1)).padStart(2, "0")}·{String(event.hour).padStart(2, "0")}</b>{event.title}<small>{event.detail}</small></span></button>) : <p>No high-importance events near this turn.</p>}</section>
        <aside className="watch-method"><Eye size={18} /><span>PUBLIC VIEW</span><p>This replay contains public farm frames, market prices, actions, and event markers from two transparent baselines. It contains no private shed state, policy, beliefs, or competition opponents.</p><button onClick={download}><Download size={14} /> Export safe replay</button></aside>
      </div>
    </div>
  );
}
