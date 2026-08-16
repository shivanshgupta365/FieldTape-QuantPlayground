import { ArrowRight, FlaskConical, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

function Arrow() { return <span className="fieldcraft-arrow" aria-hidden="true">→</span>; }

export function FieldcraftPage() {
  return <div className="page fieldcraft-page">
    <PageHeader eyebrow="FIELDCRAFT / THE MODEL" title="How a farm becomes a quantitative problem." dek="FieldTape turns capacity, cash, timing, and market impact into a deterministic 30-day strategy simulation—not a real-world forecast." />
    <img className="fieldcraft-hero-art" src="/fieldcraft-model.png" alt="Illustrated field-to-model process: farm signals lead to market and risk charts, then a decision ledger." />

    <SectionRule index="01" label="CAPACITY IS THE FIRST CONSTRAINT" value="24 MOVES / WORKER / DAY" />
    <section className="fieldcraft-split"><div><h2>A farm is a queue of decisions.</h2><p>Planting, watering, harvesting and selling share the same clock. More land can create more value—but it can also create more work than a small crew can complete.</p><Link className="button button-dark" to="/play">Test the constraint <ArrowRight size={15} /></Link></div><div className="capacity-diagram" aria-label="One worker with 24 actions, contrasted with 25 crop tasks"><div className="token-row">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div><strong>1 worker · 24 action tokens</strong><Arrow /><div className="task-grid">{Array.from({ length: 25 }, (_, index) => <i key={index} />)}</div><strong>25 watering tasks · one missed tile</strong></div></section>

    <SectionRule index="02" label="CAPITAL MOVES THROUGH THE FARM" value="CASH · INVENTORY · CASH" />
    <section className="fieldcraft-flow"><div><b>Bank</b><small>capital available</small></div><Arrow /><div><b>Seeds / labour / land</b><small>cash committed now</small></div><Arrow /><div><b>Growing crop & inventory</b><small>time and operational risk</small></div><Arrow /><div><b>Staggered sales</b><small>shared-market impact</small></div><Arrow /><div><b>Bank</b><small>reinvest or protect runway</small></div></section>

    <SectionRule index="03" label="TIME CHANGES THE BET" value="HARD CLOSE: DAY 30" />
    <section className="fieldcraft-timeline"><header><h2>A longer crop can be more profitable—and still be the wrong decision.</h2><p>Every crop has an upfront cost, a first-yield window, and a hard season close. The question is not just “what pays most?” but “what pays in time?”</p></header><div className="timeline-bars">{[["Wheat", "day 4", "short"], ["Tomato", "day 8", "medium"], ["Strawberry", "day 12", "long"], ["Melon", "day 17", "late"]].map(([crop, day, tone]) => <div key={crop} className={tone}><span>{crop}</span><i /><b>first yield {day}</b></div>)}</div></section>

    <SectionRule index="04" label="MARKET IMPACT, NOT A PRICE FORECAST" value="ONE SHARED SIMULATED MARKET" />
    <section className="fieldcraft-market"><div className="market-loop"><span>Crop supply</span><Arrow /><span>Sale volume</span><Arrow /><span>Simulated price response</span><Arrow /><span>Next decision</span></div><div><h2>Both farms can move the same market.</h2><p>Large, synchronized sales change the simulated price seen by both desks. It is a model for learning feedback loops—not a claim about real crop prices.</p></div></section>

    <SectionRule index="05" label="MODEL, TEST, REPLAY" value="HYPOTHESIS → EVIDENCE" />
    <section className="fieldcraft-method"><article><span>1</span><h2>Choose a hypothesis</h2><p>“A second worker before expansion will reduce missed watering.”</p></article><article><span>2</span><h2>Run a controlled scenario</h2><p>Change a single assumption in the Research terminal or through a season.</p></article><article><span>3</span><h2>Inspect the result</h2><p>Verified scores replay the ordered moves on the server before they appear on the board.</p></article></section>
    <div className="fieldcraft-actions"><Link className="button button-dark" to="/research"><FlaskConical size={15} /> Open research</Link><Link className="button button-outline" to="/leaderboard">See verified board <ArrowRight size={15} /></Link></div>
    <section className="fieldcraft-boundary"><ShieldCheck size={28} /><div><h2>What FieldTape models—and what it does not.</h2><p>It models an invented, deterministic farm economy with its own crops, coins, rules, and balance table. It does not provide live agriculture, investment, or financial advice; it does not predict real markets or farm profitability.</p></div></section>
  </div>;
}
