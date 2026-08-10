import { ArrowUpRight, Code2, Eye, Scale, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

export function StoryPage() {
  return (
    <div className="page story-page">
      <PageHeader eyebrow="METHODS / ATTRIBUTION / BOUNDARIES" title="A spectator layer, not a strategy leak." dek="FieldTape explains public simulation mechanics through original, deterministic scenarios. The competition agent and its research artifacts live behind a physical code boundary." />
      <div className="story-lead"><p>Kaggriculture looks like a farming game. Under the art sits a capital-allocation problem with a hard horizon, limited execution capacity, partial information, and a market affected by both players.</p><p>That makes it unusually good material for teaching how objectives and constraints change an otherwise obvious strategy.</p></div>

      <SectionRule index="01" label="WHAT THIS PRODUCT CONTAINS" />
      <div className="boundary-grid">
        <article><Eye /><span>PUBLIC</span><h2>FieldTape</h2><ul><li>Original browser simulation</li><li>Public baseline opponents</li><li>Synthetic deterministic replays</li><li>Educational diagnostics</li></ul></article>
        <article className="private"><ShieldCheck /><span>PRIVATE</span><h2>Competition research</h2><ul><li>Active policy and thresholds</li><li>Opponent-derived observations</li><li>Private score distributions</li><li>Candidate experiment logs</li></ul></article>
      </div>

      <SectionRule index="02" label="THE PUBLIC MODEL" />
      <div className="story-method">
        <div><h2>Deterministic by default.</h2><p>A seed and ordered action log reproduce every published challenge. Rendering reads simulation state; it never owns the state. That lets the same contract power play, watch, scrub, verification, and notebook export.</p></div>
        <pre><code>{`PublicReplayV1 {
  engineVersion
  seed
  publicFarmFrames[]
  market[]
  lead[]
  eventMarkers[]
}`}</code></pre>
      </div>

      <SectionRule index="03" label="OFFICIAL SOURCES" />
      <div className="source-list">
        <a href="https://www.kaggle.com/competitions/kaggriculture" target="_blank" rel="noreferrer"><span>Competition</span><strong>Kaggriculture — official Kaggle page</strong><ArrowUpRight /></a>
        <a href="https://github.com/Kaggle/kaggle-environments/tree/master/kaggle_environments/envs/kaggriculture" target="_blank" rel="noreferrer"><span>Environment</span><strong>Kaggle environments — Kaggriculture source</strong><ArrowUpRight /></a>
        <a href="https://github.com/Kaggle/kaggle-environments/blob/master/LICENSE" target="_blank" rel="noreferrer"><span>License</span><strong>Apache License 2.0</strong><ArrowUpRight /></a>
      </div>

      <section className="disclaimer-block"><Scale /><div><h2>Educational simulation only</h2><p>FieldTape uses fictional crops, coins, and simplified price curves. It does not connect to financial markets, recommend real investments, or provide financial advice. Kaggle and Kaggriculture are marks of their respective owners; this project is unofficial.</p></div></section>
      <div className="story-cta"><Code2 /><div><p className="eyebrow">READY TO TEST THE MODEL?</p><h2>The explanation is better when you can break it.</h2></div><Link className="button button-gold" to="/play">Play a season</Link></div>
    </div>
  );
}

