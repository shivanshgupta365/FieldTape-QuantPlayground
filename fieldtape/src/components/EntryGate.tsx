import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export function EntryGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  useEffect(() => {
    const client = supabase
    if (!client) return setReady(true)
    void client.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) {
        setHasProfile(false)
        setReady(true)
        return
      }
      const { data: profile } = await client
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
      setHasProfile(Boolean(profile))
      setReady(true)
    })
  }, [])
  if (!ready) return <div className="loading-tape" role="status"><span>ALPSTEAD</span><i /><small>checking field notes…</small></div>
  if (!hasProfile) return <Navigate replace to={`/join?next=${encodeURIComponent(location.pathname + location.search)}`} />
  return <>{children}</>
}
