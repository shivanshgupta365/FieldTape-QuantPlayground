import { Bot, ChevronRight, CircleHelp, Heart, RotateCcw, Shovel, SkipForward, Sprout, Target, Wheat } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionDock, type ActionId } from "../components/ActionDock";
import { Farm3D } from "../farm3d/Farm3D";
import type { CanvasTile } from "../farm3d/types";
import { MarketTape, type MarketQuote } from "../components/MarketTape";
import { StatStrip } from "../components/StatStrip";
import {
  ANIMAL_IDS,
  ANIMAL_SPECS,
  CROP_IDS,
  CROP_SPECS,
  actionIssue,
  PRODUCT_IDS,
  baselineAction,
  createGame,
  dispatchHumanAction,
  selectClock,
  selectFarmMetrics,
  selectMarketTape,
  selectScoreboard,
  stepGame,
  type AnimalId,
  type CropId,
  type GameAction,
  type GameState,
  type ProductId,
} from "../game";
import { canvasTilesFromState } from "../lib/gameView";
import { askCoach, localAdvice } from "../lib/coach";
import { submitRun } from "../lib/leaderboard";

const cropNames: Record<CropId, string> = { WHEAT: "Wheat", CARROT: "Carrot", TOMATO: "Tomato", STRAWBERRY: "Strawberry", MELON: "Melon" };
const symbols: Record<string, string> = { WHEAT: "WHT", CARROT: "CRT", TOMATO: "TOM", STRAWBERRY: "STR", MELON: "MLN" };

function quotesFromState(state: GameState): MarketQuote[] {
  return selectMarketTape(state).filter((row) => CROP_IDS.includes(row.product as CropId)).map((row) => ({ symbol: symbols[row.product] ?? row.product.slice(0, 3), label: row.product, price: row.price, change: row.changePct * 100 }));
}

export function PlayPage() {
  const [state, setState] = useState(() => createGame({ seed: "alpstead-player-7301", playerNames: ["Your desk", "Public baseline"] }));
  // Turn submission can be quicker than React rendering. Keep the authoritative
  // in-memory state in lockstep with the log so a rapid double input cannot
  // create a 720-entry timeline that disagrees with the visible game.
  const stateRef = useRef(state);
  const [selectedId, setSelectedId] = useState<string>();
  const [active, setActive] = useState<ActionId>();
  const [animalPickerOpen, setAnimalPickerOpen] = useState(false);
  const [notice, setNotice] = useState("Select a plot, then commit one action. Every order advances the shared clock.");
  const [sellProduct, setSellProduct] = useState<ProductId>("WHEAT");
  const [coach, setCoach] = useState<{ advice: string; source: string } | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [actionLog, setActionLog] = useState<GameAction[][]>([]);
  const [posting, setPosting] = useState(false);
  const [postNotice, setPostNotice] = useState("");
  const clock = selectClock(state);
  const score = selectScoreboard(state);
  const metrics = selectFarmMetrics(state, 0);
  const board = useMemo(() => canvasTilesFromState(state, 0), [state]);
  const quotes = useMemo(() => quotesFromState(state), [state]);
  const selected = state.farms[0].tiles.find((tile) => tile.id === selectedId);

  const commit = useCallback((action: GameAction): boolean => {
    const current = stateRef.current;
    const issue = actionIssue(current, action, 0);
    if (issue) {
      setNotice(`Order not sent: ${issue}. No clock tick was used.`);
      return false;
    }
    const next = dispatchHumanAction(current, action, 0, "balanced");
    stateRef.current = next;
    setState(next);
    setActionLog((current) => [...current, [action]]);
    setNotice(`Committed ${action.type}. The public baseline moved at the same clock tick.`);
    return true;
  }, []);

  const handleAction = useCallback((action: ActionId) => {
    setActive(action);
    if (action === "hire") { commit({ type: "hire" }); return; }
    if (action === "land") { commit({ type: "buyLand" }); return; }
    if (action === "sell") {
      const amount = state.farms[0].stock[sellProduct];
      commit({ type: "sell", product: sellProduct, amount });
      return;
    }
    if (!selectedId) { setNotice(`Choose an unlocked plot before using ${action}.`); return; }
    if (action === "water") commit({ type: "water", tileId: selectedId });
    if (action === "harvest") commit({ type: "harvest", tileId: selectedId });
  }, [commit, selectedId, sellProduct, state.farms]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const ids: ActionId[] = ["plant", "water", "harvest", "sell", "hire", "land"];
      const action = ids[Number(event.key) - 1];
      if (action) { event.preventDefault(); handleAction(action); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAction]);

  const plant = (crop: CropId) => {
    if (!selectedId) return setNotice("Choose an unlocked empty plot first.");
    commit({ type: "plant", tileId: selectedId, crop });
    setActive(undefined);
  };

  const placeAnimal = (animal: AnimalId) => {
    if (!selectedId) return setNotice("Choose an unlocked empty plot first.");
    if (commit({ type: "placeAnimal", tileId: selectedId, animal })) setAnimalPickerOpen(false);
  };

  const delegateDay = () => {
      let next = stateRef.current;
      const delegated: GameAction[][] = [];
      const target = Math.min(next.config.days * next.config.turnsPerDay, (Math.floor(next.turn / 24) + 1) * 24);
      while (next.status === "running" && next.turn < target) {
        const action = baselineAction(next, 0, "steady")
        delegated.push([...action])
        next = stepGame(next, { 0: action, 1: baselineAction(next, 1, "balanced") })
      }
    stateRef.current = next;
    setState(next);
    setActionLog((current) => [...current, ...delegated]);
    setNotice("The transparent steady baseline completed the remaining moves for this day.");
  };
  const postScore = async () => {
    setPosting(true)
    const result = await submitRun({ seed: String(state.seed), finalMoney: score[0].money, daysCompleted: state.day, actionsUsed: actionLog.flat().length, actionLog })
    setPosting(false)
    setPostNotice(result.ok ? `Verified — you are #${result.rank}.` : result.message)
  }

  const coachState = useCallback(() => ({
    day: state.day,
    hour: state.hour,
    money: state.farms[0].money,
    workers: state.farms[0].workers,
    plantedTiles: metrics.occupiedTiles,
    dryTiles: metrics.dryRiskTiles,
    readyTiles: metrics.harvestableTiles,
    unlockedTiles: metrics.unlockedTiles,
    stockUnits: metrics.stockUnits,
  }), [state, metrics]);

  const requestCoach = useCallback(async () => {
    setCoachBusy(true);
    // Show the deterministic answer immediately, then upgrade it if a provider
    // replies. The panel is never blank and never spins on a dead network.
    const snapshot = coachState();
    setCoach({ advice: localAdvice(snapshot), source: "local" });
    const reply = await askCoach(snapshot);
    setCoach(reply);
    setCoachBusy(false);
  }, [coachState]);

  const selectTile = (tile: CanvasTile) => {
    setSelectedId(tile.id);
    const what = tile.crop ?? tile.animal ?? (tile.weed ? "WEED" : null);
    setNotice(what ? `${what} on plot ${tile.x + 1},${tile.y + 1}.` : `Plot ${tile.x + 1},${tile.y + 1} is empty and ready.`);
  };
  const finished = state.status === "finished";

  return (
    <div className="play-page">
      <header className="game-status-bar">
        <div className="game-mode"><span>PLAY / HUMAN VS PUBLIC BASELINE</span><strong>SEED {state.seed.toString(16).toUpperCase()}</strong></div>
        <div className="clock-block"><span>DAY</span><b>{clock.displayDay.toString().padStart(2, "0")}</b><i>/ 30</i><span>TURN</span><b>{clock.hour.toString().padStart(2, "0")}</b><i>/ 24</i></div>
        <div className="lead-block"><span>BANK LEAD</span><b className={score[0].lead >= 0 ? "positive" : "negative"}>{score[0].lead >= 0 ? "+" : ""}¢{score[0].lead.toLocaleString()}</b><small>margin shown; outcome is W/L/tie</small></div>
        <button className="reset-game" onClick={() => { const next = createGame({ seed: "alpstead-player-7301", playerNames: ["Your desk", "Public baseline"] }); stateRef.current = next; setState(next); setActionLog([]); setSelectedId(undefined); }}><RotateCcw size={14} /> Restart</button>
      </header>

      <div className="play-layout">
        <section className="play-field">
          <section className="farm-shell" aria-label="Your farm">
            <header>
              <div><span>Farm A / decision surface</span><strong>Your desk</strong></div>
              <div className="farm-bank"><span>Bank</span><b>¢{state.farms[0].money.toLocaleString()}</b></div>
            </header>
            <Farm3D label="Your desk" tiles={board} selectedId={selectedId} onSelect={selectTile} />
          </section>
          <MarketTape quotes={quotes} />
        </section>

        <aside className="decision-rail">
          <header><span>DECISION TAPE</span><b>{clock.actionsLeftToday} clock ticks left today</b></header>
          <StatStrip compact stats={[
            { label: "Workers", value: String(state.farms[0].workers), delta: `${metrics.actionCapacityToday} max actions/day` },
            { label: "Occupied", value: `${metrics.occupiedTiles}/${metrics.unlockedTiles}`, delta: `${metrics.dryRiskTiles} at risk`, tone: metrics.dryRiskTiles ? "negative" : "positive" },
            { label: "Stock", value: `${metrics.stockUnits} u.`, delta: `MTM ¢${score[0].estimatedStockValue}` },
            { label: "Ready", value: String(metrics.harvestableTiles), delta: "harvestable plots" },
          ]} />

          <section className="coach-note">
            <Target size={17} />
            <div>
              <span>{coach?.source && coach.source !== "local" ? `Coach · ${coach.source}` : "Local coach"}</span>
              <p>{coach?.advice ?? notice}</p>
              <button type="button" className="coach-ask" onClick={() => void requestCoach()} disabled={coachBusy}>
                {coachBusy ? "Thinking…" : "Ask the coach"}
              </button>
            </div>
          </section>

          <section className="selected-inspector">
            <header><span>SELECTED PLOT</span><b>{selected ? `(${selected.x + 1}, ${selected.y + 1})` : "—"}</b></header>
            {selected ? <div><strong>{selected.content ? selected.content.kind === "crop" ? selected.content.crop : selected.content.kind === "animal" ? selected.content.animal : "WEED" : "EMPTY SOIL"}</strong><small>{selected.locked ? "Locked quadrant" : selected.content?.kind === "crop" ? `Age ${state.day - selected.content.plantedDay} days · ${selected.content.wateredToday ? "watered" : "dry"}${selected.content.fertilizedUntilDay >= state.day ? " · fertilized" : ""}` : selected.content?.kind === "animal" ? `${selected.content.fedToday ? "fed" : "needs feed"} · ${selected.content.caredToday ? "cared" : "care available"} · ${selected.content.yieldUnits} ready` : selected.content?.kind === "weed" ? "Clear this plot before planting." : "Available for planting or livestock"}</small></div> : <p>Click any open plot to inspect its state and place an order.</p>}
          </section>

          {selected && !selected.locked && <section className="plot-actions" aria-label="Selected plot actions">
            <header><span>PLOT ACTIONS</span><b>1 clock tick each</b></header>
            {selected.content?.kind === "crop" && <div><button type="button" onClick={() => commit({ type: "water", tileId: selected.id })}><Wheat size={14} /> Water</button><button type="button" onClick={() => commit({ type: "fertilize", tileId: selected.id })}><Sprout size={14} /> Fertilize · {state.farms[0].stock.FERTILIZER}</button><button type="button" onClick={() => commit({ type: "harvest", tileId: selected.id })}><Shovel size={14} /> Harvest</button></div>}
            {selected.content?.kind === "animal" && <div><button type="button" onClick={() => commit({ type: "feed", tileId: selected.id })}><Wheat size={14} /> Feed</button><button type="button" onClick={() => commit({ type: "care", tileId: selected.id })}><Heart size={14} /> Care</button><button type="button" onClick={() => commit({ type: "harvest", tileId: selected.id })}><Shovel size={14} /> Collect</button></div>}
            {selected.content?.kind === "weed" && <div><button type="button" onClick={() => commit({ type: "clear", tileId: selected.id })}><Shovel size={14} /> Clear weed</button></div>}
            {!selected.content && <div><button type="button" onClick={() => setAnimalPickerOpen(true)}><Heart size={14} /> Add livestock</button><small>Livestock produces fertilizer after each nightly check.</small></div>}
          </section>}

          <section className="inventory-panel"><header><span>PUBLIC DESK INVENTORY</span><select aria-label="Product to sell" value={sellProduct} onChange={(event) => setSellProduct(event.target.value as ProductId)}>{PRODUCT_IDS.map((product) => <option key={product} value={product}>{product} · {state.farms[0].stock[product]}u</option>)}</select></header><div className="inventory-grid">{PRODUCT_IDS.slice(0, 8).map((product) => <div key={product}><span>{symbols[product] ?? product.slice(0, 3)}</span><b>{state.farms[0].stock[product]}</b></div>)}</div></section>

          <button className="delegate-button" onClick={delegateDay} disabled={finished}><Bot size={15} /> Delegate rest of day <SkipForward size={14} /></button>
          <p className="rail-caveat"><CircleHelp size={13} /> Delegation uses the inspectable public steady baseline. It never calls the private competition agent.</p>
        </aside>
      </div>

      <div className="play-command-bar">
        <ActionDock active={active} onAction={handleAction} />
        {active === "plant" && <div className="crop-picker" role="dialog" aria-label="Choose crop"><header><Wheat size={15} /><span>Choose seed for plot {selectedId ?? "—"}</span><button onClick={() => setActive(undefined)}>×</button></header><div>{CROP_IDS.map((crop) => <button key={crop} disabled={!selectedId || state.farms[0].money < CROP_SPECS[crop].seedCost} onClick={() => plant(crop)}><strong>{cropNames[crop]}</strong><span>¢{CROP_SPECS[crop].seedCost}</span><small>{CROP_SPECS[crop].firstYieldDay}d first yield</small></button>)}</div></div>}
        {animalPickerOpen && <div className="crop-picker" role="dialog" aria-label="Choose livestock"><header><Heart size={15} /><span>Add livestock to plot {selectedId ?? "—"}</span><button onClick={() => setAnimalPickerOpen(false)}>×</button></header><div className="animal-picker">{ANIMAL_IDS.map((animal) => <button key={animal} disabled={!selectedId || state.farms[0].money < ANIMAL_SPECS[animal].cost} onClick={() => placeAnimal(animal)}><strong>{animal[0]}{animal.slice(1).toLowerCase()}</strong><span>¢{ANIMAL_SPECS[animal].cost}</span><small>{ANIMAL_SPECS[animal].product} from day {ANIMAL_SPECS[animal].firstYieldDay}</small></button>)}</div></div>}
        <button className="pass-action" onClick={() => commit({ type: "wait" })} disabled={finished}>Pass move <ChevronRight size={15} /></button>
      </div>

      {finished && <div className="season-result" role="dialog" aria-modal="true"><span>SEASON CLOSED</span><h2>{score[0].money > score[1].money ? "You finished ahead." : score[0].money === score[1].money ? "The desks tied." : "The baseline finished ahead."}</h2><p>Your bank: ¢{score[0].money.toLocaleString()} · Baseline: ¢{score[1].money.toLocaleString()}</p><button className="button button-gold" onClick={() => void postScore()} disabled={posting || actionLog.length !== state.config.days * state.config.turnsPerDay}>{posting ? "Verifying…" : "Post verified score"}</button>{postNotice && <p>{postNotice}</p>}<button className="button" onClick={() => { const next = createGame({ seed: Date.now(), playerNames: ["Your desk", "Public baseline"] }); stateRef.current = next; setState(next); setActionLog([]); setPostNotice("") }}>Run a new seed</button></div>}
    </div>
  );
}
