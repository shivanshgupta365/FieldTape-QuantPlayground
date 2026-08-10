import { ArrowRight, CloudOff, LogIn, NotebookPen, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";
import { hasSupabase } from "../lib/supabase";

export function ProfilePage() {
  return (
    <div className="page profile-page">
      <PageHeader eyebrow="FIELD NOTES / LOCAL-FIRST" title="Your research stays useful offline." dek="Play, complete labs, and save notebooks without an account. Connect a permanent profile only when you want to publish a verified score." aside={<div className="profile-avatar"><UserRound /><span>LOCAL</span></div>} />
      <div className="profile-layout">
        <section className="profile-summary">
          <SectionRule index="A" label="LOCAL DESK" />
          <h2>Unnamed researcher</h2>
          <p>{hasSupabase ? "The optional sync service is configured." : "This browser is your current source of truth."}</p>
          <dl><div><dt>Labs complete</dt><dd>0 / 6</dd></div><div><dt>Seasons played</dt><dd>0</dd></div><div><dt>Notebooks</dt><dd>0</dd></div></dl>
          <div className="offline-state"><CloudOff size={16} /><span>Offline play is available. Local records never need a login.</span></div>
        </section>
        <section className="profile-connect">
          <SectionRule index="B" label="OPTIONAL SYNC" />
          <h2>Publish only when you mean to.</h2>
          <p>Anonymous sessions may sync personal progress when the backend is available. Leaderboard publishing requires a permanent Google or email identity so one person cannot mint unlimited entries.</p>
          <button className="button button-dark" disabled={!hasSupabase}><LogIn size={15} /> {hasSupabase ? "Connect permanent profile" : "Backend not configured"}</button>
          <small>No service-role credentials are ever shipped to this browser.</small>
        </section>
      </div>
      <section className="profile-next"><NotebookPen /><div><p className="eyebrow">START SOMEWHERE</p><h2>Write a hypothesis, then make the field argue back.</h2></div><Link to="/lab">Open first lab <ArrowRight size={15} /></Link></section>
    </div>
  );
}

