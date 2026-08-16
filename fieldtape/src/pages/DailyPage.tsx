import { ArrowRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Farm3D } from "../farm3d/Farm3D";
import { demoFarmTiles } from "../render/demoScene";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

export function DailyPage() {
  return (
    <div className="page daily-page">
      <PageHeader eyebrow="FIELD DESK / SEASON PRACTICE" title="Make the whole season count." dek="FieldTape is a thirty-day strategy season. Set your plan, work the farm, and post a replayed score when the season closes." />
      <div className="daily-layout">
        <section className="daily-brief">
          <SectionRule index="A" label="SEASON FORMAT" value="30 DAYS" />
          <p>Every season begins with the same working farm and an evolving market. Choose when to plant, water, harvest, sell, hire, and expand.</p>
          <dl><div><dt>Length</dt><dd>30 days</dd></div><div><dt>Decision budget</dt><dd>24 actions / worker / day</dd></div><div><dt>Board rule</dt><dd>Server-replayed finish</dd></div></dl>
          <div className="daily-rule"><span>Finish the season, then post its complete action log for independent replay before it reaches the board.</span></div>
          <Link className="button button-gold" to="/play">Start a season <ArrowRight size={15} /></Link>
        </section>
        <div className="daily-board-wrap"><Farm3D label="Season preview" tiles={demoFarmTiles({ seed: "alpstead-season-preview", days: 12, style: "steady" })} /></div>
        <aside className="daily-board"><SectionRule index="B" label="SEASON BOARD" /><p>Verified player names and final banks are published on the live public board.</p><Link to="/leaderboard"><Trophy size={14} /> Open live leaderboard</Link></aside>
      </div>
    </div>
  );
}
