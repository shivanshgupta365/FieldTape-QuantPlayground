import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

const pendingNameKey = "fieldtape.pending-display-name"

function safeNext(value: string | null): string {
  return value?.startsWith("/") ? value : "/play"
}

export function JoinPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get("next"))
  const [name, setName] = useState(() => sessionStorage.getItem(pendingNameKey) ?? "")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) return
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setVerifiedUserId(data.user.id)
      const pendingName = sessionStorage.getItem(pendingNameKey)
      if (!pendingName) return
      const { error } = await client.from("profiles").upsert(
        { user_id: data.user.id, display_name: pendingName.trim() },
        { onConflict: "user_id" },
      )
      if (!error) {
        sessionStorage.removeItem(pendingNameKey)
        navigate(next, { replace: true })
      }
    })
  }, [navigate, next])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return setMessage("Profiles are temporarily unavailable.")
    const displayName = name.trim()
    if (displayName.length < 2 || displayName.length > 32) return setMessage("Use a name between 2 and 32 characters.")
    setBusy(true)
    if (verifiedUserId) {
      const { error } = await supabase.from("profiles").upsert(
        { user_id: verifiedUserId, display_name: displayName },
        { onConflict: "user_id" },
      )
      setBusy(false)
      if (error) return setMessage(error.message)
      sessionStorage.removeItem(pendingNameKey)
      navigate(next, { replace: true })
      return
    }
    sessionStorage.setItem(pendingNameKey, displayName)
    const redirect = `${window.location.origin}/join?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } })
    setBusy(false)
    setMessage(error ? error.message : "Check your inbox for the one-time sign-in link, then return here.")
  }

  return <main className="page profile-page"><section className="profile-connect"><p className="eyebrow">FIELD NOTES / PROFILE</p><h1>Put your name on the board.</h1><p>Your chosen name is public on verified leaderboards. Your email is kept private in Supabase Auth and is used only to sign you in.</p><form onSubmit={submit} className="profile-form"><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" required maxLength={32} /></label>{!verifiedUserId && <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label>}<button className="button button-dark" disabled={busy}>{busy ? "Saving…" : verifiedUserId ? "Save public name" : "Send secure sign-in link"}</button></form>{message && <p role="status">{message}</p>}<small>On the free email service, delivery can be rate-limited.</small></section></main>
}
