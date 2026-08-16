import { ArrowRight, CloudOff, NotebookPen, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader"
import { SectionRule } from "../components/SectionRule"
import { hasSupabase, supabase } from "../lib/supabase"

type FieldNotes = { name: string; labs: number; seasons: number; notebooks: number }
type FieldNotesRow = { display_name: string; labs_complete: number; seasons_played: number; notebooks_count: number }
const initialNotes: FieldNotes = { name: "Field researcher", labs: 0, seasons: 0, notebooks: 0 }

export function ProfilePage() {
  const [notes, setNotes] = useState(initialNotes)
  useEffect(() => {
    const client = supabase
    if (!client) return
    void client.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) return
      const { data: rpcData } = await client.rpc("get_my_field_notes").maybeSingle()
      const fieldNotes = rpcData as FieldNotesRow | null
      if (!fieldNotes) return
      setNotes({ name: fieldNotes.display_name, labs: fieldNotes.labs_complete, seasons: fieldNotes.seasons_played, notebooks: fieldNotes.notebooks_count })
    })
  }, [])
  return <div className="page profile-page">
    <PageHeader eyebrow="FIELD NOTES / YOUR DESK" title="Your work, kept together." dek="Your anonymous FieldTape profile keeps your progress, notebooks, and verified seasons attached to this browser." aside={<div className="profile-avatar"><UserRound /><span>FIELD</span></div>} />
    <div className="profile-layout">
      <section className="profile-summary"><SectionRule index="A" label="YOUR DESK" /><h2>{notes.name}</h2><p>{hasSupabase ? "Your field notes are syncing." : "This browser is your current source of truth."}</p><dl><div><dt>Labs complete</dt><dd>{notes.labs} / 6</dd></div><div><dt>Seasons played</dt><dd>{notes.seasons}</dd></div><div><dt>Notebooks</dt><dd>{notes.notebooks}</dd></div></dl><div className="offline-state"><CloudOff size={16} /><span>Progress remains available in this browser session.</span></div></section>
      <section className="profile-connect"><SectionRule index="B" label="PUBLIC BOARD" /><h2>Play the season. Post when it closes.</h2><p>Your display name appears on the board only after the server reproduces a completed season from your action log.</p><Link className="button button-dark" to="/play">Start a season <ArrowRight size={15} /></Link></section>
    </div>
    <section className="profile-next"><NotebookPen /><div><p className="eyebrow">START SOMEWHERE</p><h2>Write a hypothesis, then make the field argue back.</h2></div><Link to="/lab">Open first lab <ArrowRight size={15} /></Link></section>
  </div>
}
