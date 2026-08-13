import { Code2, Eye, Scale, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

export function StoryPage() {
  return (
    <div className="page story-page">
      <PageHeader eyebrow="METHODS / ATTRIBUTION / BOUNDARIES" title="A spectator layer, not a strategy leak." dek="Alpstead explains public simulation mechanics through original, deterministic scenarios. The competition agent and its research artifacts live behind a physical code boundary." />
      <div className="story-lead"><p>Alpstead looks like a farming game. Under the art sits a capital-allocation problem with a hard horizon, limited execution capacity, partial information, and a market affected by both players.</p><p>That makes it unusually good material for teaching how objectives and constraints change an otherwise obvious strategy.</p></div>

      <SectionRule index="01" label="WHAT THIS PRODUCT CONTAINS" />
      <div className="boundary-grid">
        <article><Eye /><span>PUBLIC</span><h2>Alpstead</h2><ul><li>Original browser simulation</li><li>Public baseline opponents</li><li>Synthetic deterministic replays</li><li>Deterministic replays you can scrub</li></ul></article>
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
      </div>

      <section className="disclaimer-block"><Scale /><div><h2>A game, not a market</h2><p>Alpstead uses invented crops, coins and price curves. It is not connected to any financial market and is not advice about one. Everything in it exists to make thirty days of decisions interesting.</p></div></section>
      <div className="story-cta"><Code2 /><div><p className="eyebrow">READY TO TEST THE MODEL?</p><h2>The explanation is better when you can break it.</h2></div><Link className="button button-gold" to="/play">Play a season</Link></div>
    </div>
  );
}

