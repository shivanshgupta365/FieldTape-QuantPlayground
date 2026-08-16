import { ArrowRight, Clock3, NotebookPen, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader"
import { SectionRule } from "../components/SectionRule"
import { hasSupabase, supabase } from "../lib/supabase"
import { loadPlayTimeSeconds } from "../lib/persistence"

type FieldNotes = { name: string; labs: number; seasons: number; notebooks: number; playSeconds: number }
type FieldNotesRow = { display_name: string; labs_complete: number; seasons_played: number; notebooks_count: number }
const initialNotes: FieldNotes = { name: "Field researcher", labs: 0, seasons: 0, notebooks: 0, playSeconds: 0 }

function formatPlayTime(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; }

export function ProfilePage() {
  const [notes, setNotes] = useState(initialNotes)
  const [removing, setRemoving] = useState(false)
  const [removeMessage, setRemoveMessage] = useState("")
  useEffect(() => {
    const client = supabase
    if (!client) return
    void client.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) return
      const { data: rpcData } = await client.rpc("get_my_field_notes").maybeSingle()
      const fieldNotes = rpcData as FieldNotesRow | null
      if (!fieldNotes) return
      const playSeconds = await loadPlayTimeSeconds()
      setNotes({ name: fieldNotes.display_name, labs: fieldNotes.labs_complete, seasons: fieldNotes.seasons_played, notebooks: fieldNotes.notebooks_count, playSeconds })
    })
  }, [])
  return <div className="page profile-page">
    <PageHeader eyebrow="FIELD NOTES / YOUR DESK" title="Your work, kept together." dek="Your anonymous FieldTape profile keeps your progress, notebooks, and verified seasons attached to this browser." aside={<div className="profile-avatar"><UserRound /><span>FIELD</span></div>} />
    <div className="profile-layout">
      <section className="profile-summary"><SectionRule index="A" label="YOUR DESK" /><h2>{notes.name}</h2><p>{hasSupabase ? "Your field notes are syncing." : "This browser is your current source of truth."}</p><dl><div><dt>Time in field</dt><dd>{formatPlayTime(notes.playSeconds)}</dd></div><div><dt>Labs complete</dt><dd>{notes.labs} / 6</dd></div><div><dt>Seasons played</dt><dd>{notes.seasons}</dd></div><div><dt>Notebooks</dt><dd>{notes.notebooks}</dd></div></dl><div className="offline-state"><Clock3 size={16} /><span>Time counts while the Play screen is active.</span></div></section>
      <section className="profile-connect"><SectionRule index="B" label="PUBLIC BOARD" /><h2>Finish 30 days. Then post.</h2><p>Complete all 30 days and 720 recorded turns to post a full-season score. At the end of any earlier day, you can also post a server-replayed practice checkpoint to compare runs of that same length.</p><Link className="button button-dark" to="/play">Start a season <ArrowRight size={15} /></Link><button className="profile-delete" type="button" disabled={removing} onClick={() => { if (!window.confirm("Delete your FieldTape profile, private email, progress, and posted scores? This cannot be undone.")) return; const client = supabase; if (!client) return; setRemoving(true); void client.rpc("delete_my_fieldtape_data").then(async ({ error }) => { if (error) { setRemoveMessage("Could not remove your data. Please try again."); setRemoving(false); return; } await client.auth.signOut(); window.location.assign("/"); }); }}>{removing ? "Removing data…" : "Delete my FieldTape data"}</button>{removeMessage && <small>{removeMessage}</small>}</section>
    </div>
    <section className="profile-next"><NotebookPen /><div><p className="eyebrow">START SOMEWHERE</p><h2>Write a hypothesis, then make the field argue back.</h2></div><Link to="/lab">Open first lab <ArrowRight size={15} /></Link></section>
  </div>
}
