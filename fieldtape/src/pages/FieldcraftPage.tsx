import { ArrowRight, FlaskConical, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

function Arrow() { return <span className="fieldcraft-arrow" aria-hidden="true">→</span>; }

export function FieldcraftPage() {
  return <div className="page fieldcraft-page">
    <PageHeader eyebrow="FIELDCRAFT / THE MODEL" title="How a farm becomes a quantitative problem." dek="FieldTape turns capacity, cash, timing, and market impact into a deterministic 30-day strategy simulation." />
    <img className="fieldcraft-hero-art" src="/fieldcraft-model.png" alt="Illustrated field-to-model process: farm signals lead to market and risk charts, then a decision ledger." />

    <section className="fieldcraft-primer"><header><p className="eyebrow">THE TRANSLATION</p><h2>Every farm verb has a quantitative counterpart.</h2><p>You do not need a finance background. Fieldcraft simply names the trade-offs that are already present when you choose one move instead of another.</p></header><div><article><b>Plant</b><span>Capital allocation</span><p>Spend limited bank on an asset whose return arrives later.</p></article><article><b>Water</b><span>Operational risk control</span><p>Protect the value already committed before chasing the next opportunity.</p></article><article><b>Hire</b><span>Capacity investment</span><p>Pay now to expand the number of decisions you can complete each day.</p></article><article><b>Sell</b><span>Execution & market impact</span><p>Turn inventory into cash while your volume changes the shared price curve.</p></article></div></section>

    <SectionRule index="01" label="CAPACITY IS THE FIRST CONSTRAINT" value="24 MOVES / WORKER / DAY" />
    <section className="fieldcraft-split"><div><h2>A farm is a queue of decisions.</h2><p>Planting, watering, harvesting and selling share the same clock. More land can create more value—but it can also create more work than a small crew can complete.</p><Link className="button button-dark" to="/play">Test the constraint <ArrowRight size={15} /></Link></div><div className="capacity-diagram" aria-label="One worker with 24 actions, contrasted with 25 crop tasks"><div className="token-row">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div><strong>1 worker · 24 action tokens</strong><Arrow /><div className="task-grid">{Array.from({ length: 25 }, (_, index) => <i key={index} />)}</div><strong>25 watering tasks · one missed tile</strong></div></section>

    <SectionRule index="02" label="CAPITAL MOVES THROUGH THE FARM" value="CASH · INVENTORY · CASH" />
    <section className="fieldcraft-flow"><div><b>Bank</b><small>capital available</small></div><Arrow /><div><b>Seeds / labour / land</b><small>cash committed now</small></div><Arrow /><div><b>Growing crop & inventory</b><small>time and operational risk</small></div><Arrow /><div><b>Staggered sales</b><small>shared-market impact</small></div><Arrow /><div><b>Bank</b><small>reinvest or protect runway</small></div></section>

    <SectionRule index="03" label="TIME CHANGES THE BET" value="HARD CLOSE: DAY 30" />
    <section className="fieldcraft-timeline"><header><h2>A longer crop can be more profitable—and still be the wrong decision.</h2><p>Every crop has an upfront cost, a first-yield window, and a hard season close. The question is not just “what pays most?” but “what pays in time?”</p></header><div className="timeline-bars">{[["Wheat", "day 4", "short"], ["Tomato", "day 8", "medium"], ["Strawberry", "day 12", "long"], ["Melon", "day 17", "late"]].map(([crop, day, tone]) => <div key={crop} className={tone}><span>{crop}</span><i /><b>first yield {day}</b></div>)}</div></section>
    <section className="fieldcraft-case-study"><img src="/fieldcraft-operations.png" alt="Illustrated crop grid, probability fan, seasonal calendar, and cash-flow operations diagram." /><div><p className="eyebrow">READING A SEASON</p><h2>From plot condition to distribution of outcomes.</h2><p>A decision is rarely one number. A crop’s payoff depends on its maturity, water status, action capacity, sale timing, and the other desk’s supply. The diagram shows the chain: observe the field, choose an action, update the state, then compare the possible paths.</p><dl><div><dt>State</dt><dd>Plots, workers, inventory, bank</dd></div><div><dt>Control</dt><dd>Ordered actions across 720 turns</dd></div><div><dt>Outcome</dt><dd>Bank, yield, missed work, price response</dd></div></dl></div></section>

    <SectionRule index="04" label="MARKET IMPACT, NOT A PRICE FORECAST" value="ONE SHARED SIMULATED MARKET" />
    <section className="fieldcraft-market"><div className="market-loop"><span>Crop supply</span><Arrow /><span>Sale volume</span><Arrow /><span>Simulated price response</span><Arrow /><span>Next decision</span></div><div><h2>Both farms can move the same market.</h2><p>Large, synchronized sales change the simulated price seen by both desks. It is a model for learning feedback loops—not a claim about real crop prices.</p></div></section>

    <SectionRule index="05" label="RISK IS A RANGE, NOT A SINGLE NUMBER" value="BASELINE · UPSIDE · DOWNSIDE" />
    <section className="fieldcraft-risk"><div className="risk-fan" aria-label="Illustration of a range of simulated bank outcomes"><i /><i /><i /><i /><i /></div><div><h2>Plan for a band of outcomes.</h2><p>Research runs repeat a deterministic model under stated assumptions. Instead of asking for one magical answer, inspect a conservative path, a central path, and an optimistic path. Then ask what changes the band: extra capacity, slower sales, missed watering, or a later crop.</p><ul><li><b>Median:</b> the middle simulated result.</li><li><b>Downside:</b> what the plan costs when timing breaks against you.</li><li><b>Upside:</b> what needs to go right before expansion is justified.</li></ul></div></section>

    <SectionRule index="06" label="MODEL, TEST, REPLAY" value="HYPOTHESIS → EVIDENCE" />
    <section className="fieldcraft-method"><article><span>1</span><h2>Choose a hypothesis</h2><p>“A second worker before expansion will reduce missed watering.”</p></article><article><span>2</span><h2>Run a controlled scenario</h2><p>Change a single assumption in the Research terminal or through a season.</p></article><article><span>3</span><h2>Inspect the result</h2><p>Verified scores replay the ordered moves on the server before they appear on the board.</p></article></section>
    <div className="fieldcraft-actions"><Link className="button button-dark" to="/research"><FlaskConical size={15} /> Open research</Link><Link className="button button-outline" to="/leaderboard">See verified board <ArrowRight size={15} /></Link></div>
    <section className="fieldcraft-boundary"><ShieldCheck size={28} /><div><h2>What FieldTape models—and what it does not.</h2><p>It models an invented, deterministic farm economy with its own crops, coins, rules, and balance table. It does not provide live agriculture, investment, or financial advice; it does not predict real markets or farm profitability.</p></div></section>
  </div>;
}
