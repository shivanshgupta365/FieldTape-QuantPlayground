import { ArrowRight, BarChart3, Clock3, Github, Play, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { FarmCanvas } from "../render/FarmCanvas";
import { demoFarmTiles } from "../render/demoScene";
import { LineChart } from "../components/LineChart";
import { MarketTape } from "../components/MarketTape";
import { SectionRule } from "../components/SectionRule";
import { labs } from "../data/labs";

const heroTiles = demoFarmTiles({ seed: "alpstead-hero", days: 16, style: "balanced" });

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <BrandMark />
        <nav aria-label="Landing navigation">
          <Link to="/watch">Watch a season</Link>
          <Link to="/lab">Quant labs</Link>
          <Link to="/story">How it works</Link>
        </nav>
        <Link className="button button-dark" to="/play">Enter simulation <ArrowRight size={15} /></Link>
      </header>

      <main id="main">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow"><span className="live-dot" /> LUCERNE VALLEY · SEASON 01</p>
            <h1>Every crop<br />is a position.</h1>
            <p className="hero-dek">A playable capital-allocation game where 720 moves, a hard deadline, and one shared market turn a quiet farm into a strategy desk.</p>
            <div className="hero-actions">
              <Link className="button button-gold" to="/play"><Play size={15} fill="currentColor" /> Play the game</Link>
              <Link className="text-link" to="/watch">Watch the AI season <ArrowRight size={15} /></Link>
            </div>
            <dl className="hero-facts">
              <div><dt>Horizon</dt><dd>30 days</dd></div>
              <div><dt>Budget</dt><dd>24 moves / day</dd></div>
              <div><dt>Objective</dt><dd>P(win), not margin</dd></div>
            </dl>
          </div>

          <div className="hero-sim" aria-label="Alpstead simulation preview">
            <div className="hero-sim-top">
              <span>LIVE MODEL / SEED 7301</span>
              <b>DAY 18 <i>·</i> 14:00</b>
            </div>
            <FarmCanvas label="Farm A" tiles={heroTiles} scale={2} />
            <div className="hero-float-card risk-card"><span>RISK FLAG</span><b>3 dry plots</b><small>8 moves before close</small></div>
            <div className="hero-float-card lead-card"><span>MARK-TO-MARKET LEAD</span><b>+¢1,284</b><small>confidence 71%</small></div>
            <MarketTape compact />
          </div>
        </section>

        <div className="landing-marquee" aria-label="Core simulation concepts">
          <span>CAPITAL LOCKUP</span><i>◆</i><span>ACTION BUDGET</span><i>◆</i><span>MARKET IMPACT</span><i>◆</i><span>DURATION</span><i>◆</i><span>WIN PROBABILITY</span>
        </div>

        <section className="thesis-section">
          <SectionRule index="01" label="THE THESIS" value="SIMULATION, NOT ADVICE" />
          <div className="thesis-grid">
            <h2>A farm is a portfolio<br />with dirt under its nails.</h2>
            <div>
              <p>You deploy limited capital into assets with different lockups, yields, upkeep, and terminal values. Then execution gets in the way.</p>
              <p>Alpstead makes that machinery visible: cash-flow curves, worker utilization, slippage, and the probability that you finish one coin ahead.</p>
            </div>
          </div>
          <div className="concept-strip">
            <article><Clock3 /><span>01</span><h3>The clock prices every decision</h3><p>A melon bought late is not cheap. It is worthless.</p></article>
            <article><Waves /><span>02</span><h3>Your orders move the market</h3><p>The displayed quote is not the price of the whole sale.</p></article>
            <article><BarChart3 /><span>03</span><h3>Winning changes the objective</h3><p>A one-coin edge pays the same rating outcome as a blowout.</p></article>
          </div>
        </section>

        <section className="terminal-section">
          <SectionRule index="02" label="WATCH THE MACHINE" value="SYNTHETIC PUBLIC BASELINES" />
          <div className="terminal-grid">
            <div className="terminal-copy">
              <p className="eyebrow">SPECTATOR MODE</p>
              <h2>See the decision,<br />not just the score.</h2>
              <p>Jump to every harvest, hire, land purchase, and lead reversal. Scrub a complete deterministic season without exposing private competition policy.</p>
              <Link className="button button-outline" to="/watch">Open the tape <ArrowRight size={15} /></Link>
            </div>
            <div className="terminal-visual">
              <header><span>NET COIN CURVE</span><b>DAY 01 → 30</b></header>
              <LineChart
                height={260}
                series={[
                  { label: "Staple / low variance", color: "#41b7ba", values: [0, -300, -220, 180, 470, 850, 1110, 1430, 1710, 2100, 2520] },
                  { label: "Premium / high variance", color: "#e7a72f", values: [0, -900, -1060, -980, -430, 520, 1980, 1740, 3020, 2710, 3680] },
                ]}
                marker={0.58}
              />
              <div className="terminal-readout"><span>LEAD FLIP / DAY 18</span><strong>Premium harvest changes P(win) <b>43% → 68%</b></strong></div>
            </div>
          </div>
        </section>

        <section className="curriculum-section">
          <SectionRule index="03" label="THE FIELD MANUAL" value={`${labs.length} INTERACTIVE LABS`} />
          <header><h2>Learn quant ideas<br />by making them fail.</h2><p>Form a hypothesis, change one assumption, run seeded scenarios, and read the post-trade diagnostic.</p></header>
          <div className="lab-list">
            {labs.map((lab) => (
              <Link to={`/lab/${lab.id}`} key={lab.id} className={`lab-row accent-${lab.accent}`}>
                <span>{lab.number}</span><h3>{lab.title}</h3><p>{lab.concept}</p><ArrowRight size={19} />
              </Link>
            ))}
          </div>
        </section>

        <section className="proof-section">
          <div><ShieldCheck size={29} /><strong>Public-safe by construction</strong><span>No private policy, opponent data, or live competition replay payloads.</span></div>
          <div><Github size={29} /><strong>Deterministic & inspectable</strong><span>Seeded scenarios, exportable notebooks, and public baseline methods.</span></div>
          <div><BarChart3 size={29} /><strong>A game, not a market</strong><span>Invented crops, invented coins. Nothing here touches a real asset.</span></div>
        </section>

        <section className="landing-cta">
          <p className="eyebrow">THE BELL IS ABOUT TO RING</p>
          <h2>Thirty days.<br />Make every move count.</h2>
          <Link className="button button-gold" to="/play">Start a season <ArrowRight size={17} /></Link>
          <small>Runs locally in your browser · no account required</small>
        </section>
      </main>

      <footer className="landing-footer">
        <BrandMark />
        <p>Alpstead — a farming game about capital, set above Lake Lucerne.</p>
        <div><Link to="/learn">How to play</Link><Link to="/story">About</Link></div>
      </footer>
    </div>
  );
}

