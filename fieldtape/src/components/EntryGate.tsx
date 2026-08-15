import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export function EntryGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    if (!supabase) return setReady(true)
    void supabase.auth.getUser().then(({ data }) => { setSignedIn(Boolean(data.user)); setReady(true) })
  }, [])
  if (!ready) return <div className="loading-tape" role="status"><span>ALPSTEAD</span><i /><small>checking field notes…</small></div>
  if (!signedIn) return <Navigate replace to={`/join?next=${encodeURIComponent(location.pathname + location.search)}`} />
  return <>{children}</>
}
