import { Medal, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";
import { hasSupabase } from "../lib/supabase";

const rows = [
  ["01", "grain_alpha", "¢5,884", "6", "0"],
  ["02", "soil_signal", "¢5,796", "6", "0"],
  ["03", "fieldnote", "¢5,642", "6", "0"],
  ["04", "dirt_duration", "¢5,598", "6", "1"],
  ["05", "market_gardener", "¢5,521", "6", "0"],
  ["06", "harvest_beta", "¢5,470", "6", "1"],
  ["07", "crop_curve", "¢5,428", "6", "0"],
  ["08", "late_liquidity", "¢5,391", "6", "2"],
];

export function LeaderboardPage() {
  return (
    <div className="page leaderboard-page">
      <PageHeader eyebrow="VERIFIED DAILY BOARD" title="One seed. Six moves. No rewinds." dek="Scores are replayed against the published deterministic challenge contract before they can enter the board." aside={<div className="verification-badge"><ShieldCheck /><span>VERIFICATION</span><strong>{hasSupabase ? "ONLINE" : "DEMO MODE"}</strong></div>} />
      {!hasSupabase && <div className="demo-banner"><span>DEMO DATA</span> Supabase is not connected in this build. The rows below illustrate the verified-board format and are not live user scores.</div>}
      <SectionRule index="01" label="AUG 09 / THE SIX-MOVE RESCUE" value="PERMANENT PROFILES ONLY" />
      <div className="leaderboard-table" role="table" aria-label="Daily challenge leaderboard">
        <div className="leaderboard-head" role="row"><span>Rank</span><span>Desk</span><span>Terminal bank</span><span>Moves</span><span>Losses</span></div>
        {rows.map((row, index) => <div role="row" key={row[1]} className={index < 3 ? "podium" : undefined}><span>{index < 3 && <Medal size={14} />}{row[0]}</span><strong>{row[1]}</strong><b>{row[2]}</b><span>{row[3]} / 6</span><span>{row[4]}</span></div>)}
      </div>
      <div className="leaderboard-method"><h2>What “verified” means</h2><p>The browser submits the seed, action log, and result—not a trusted score. A free server function authenticates permanent profiles, rate-limits attempts, replays the action log, and writes only the reproduced result.</p><code>score = replay(challenge_seed, ordered_actions)</code></div>
    </div>
  );
}

