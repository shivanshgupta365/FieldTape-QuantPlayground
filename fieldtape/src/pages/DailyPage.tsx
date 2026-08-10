import { ArrowRight, Lock, Timer, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { GameBoard, makeDemoTiles } from "../components/GameBoard";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

export function DailyPage() {
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase();
  return (
    <div className="page daily-page">
      <PageHeader eyebrow={`DAILY FIELD TEST / ${date}`} title="The six-move rescue." dek="A crop-heavy farm, one exhausted worker, and a closing market. Finish the day with no preventable losses." aside={<div className="daily-clock"><Timer size={17} /><span>NEXT SEED</span><strong>18:42:09</strong></div>} />
      <div className="daily-layout">
        <section className="daily-brief">
          <SectionRule index="A" label="BRIEF" value="INTERMEDIATE" />
          <p>You inherit this state on day 17, turn 18. Six moves remain. Wheat settles after close; the tomato patch dies after one more missed watering.</p>
          <dl><div><dt>Objective</dt><dd>End above ¢5,250</dd></div><div><dt>Move budget</dt><dd>6 actions</dd></div><div><dt>Hidden test</dt><dd>Crop survival</dd></div></dl>
          <div className="daily-rule"><Lock size={15} /><span>The seed and baseline are fixed. One verified score per permanent profile.</span></div>
          <Link className="button button-gold" to="/play?challenge=daily">Enter challenge <ArrowRight size={15} /></Link>
        </section>
        <div className="daily-board-wrap"><GameBoard label="Challenge state" player="Your desk" coins={4_718} tiles={makeDemoTiles("left", 3).map((tile, index) => ({ ...tile, locked: tile.x > 5 || tile.y > 5, urgent: index === 12 || index === 23 || index === 34 }))} compact /></div>
        <aside className="daily-board"><SectionRule index="B" label="TODAY'S BOARD" /><ol><li><span>01</span><b>grain_alpha</b><em>¢5,884</em></li><li><span>02</span><b>soil_signal</b><em>¢5,796</em></li><li><span>03</span><b>fieldnote</b><em>¢5,642</em></li></ol><Link to="/leaderboard"><Trophy size={14} /> Full leaderboard</Link></aside>
      </div>
    </div>
  );
}
