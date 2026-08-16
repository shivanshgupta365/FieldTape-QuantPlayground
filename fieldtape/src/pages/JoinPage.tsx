import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

function safeNext(value: string | null): string {
  return value?.startsWith("/") ? value : "/play"
}

export function JoinPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get("next"))
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return setMessage("Profiles are temporarily unavailable.")
    const displayName = name.trim()
    const contactEmail = email.trim().toLowerCase()
    if (displayName.length < 2 || displayName.length > 32) return setMessage("Use a name between 2 and 32 characters.")
    if (!contactEmail) return setMessage("Enter an email address.")
    setBusy(true)
    const { data: current } = await supabase.auth.getUser()
    let userId = current.user?.id
    if (!userId) {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error || !data.user) {
        setBusy(false)
        return setMessage("Could not start your player profile. Please try again.")
      }
      userId = data.user.id
    }
    const { error } = await supabase.from("profiles").upsert(
      { user_id: userId, display_name: displayName, contact_email: contactEmail },
      { onConflict: "user_id" },
    )
    setBusy(false)
    if (error) return setMessage("Could not save your profile. Please try again.")
    navigate(next, { replace: true })
  }

  return <main className="page profile-page"><section className="profile-connect"><p className="eyebrow">FIELD NOTES / PROFILE</p><h1>Put your name on the board.</h1><p>Your chosen name is shown on verified leaderboards.</p><form onSubmit={submit} className="profile-form"><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" required maxLength={32} /></label><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label><button className="button button-dark" disabled={busy}>{busy ? "Saving…" : "Enter FieldTape"}</button></form><small className="profile-data-note">Your email is private, is not used for login, and is never shown on rankings. You can delete your FieldTape data from Profile.</small>{message && <p role="status">{message}</p>}</section></main>
}
