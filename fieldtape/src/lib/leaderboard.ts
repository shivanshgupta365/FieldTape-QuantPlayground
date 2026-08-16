/**
 * Leaderboard data access.
 *
 * Reads come straight from the public `season_leaderboard` view, which is
 * readable by anon, so the board renders for signed-out visitors. Writes never
 * touch the table directly — they go through an edge function that replays the
 * action log, because a client-writable score table is not a leaderboard.
 */

import { BRAND } from "../brand"
import { hasSupabase, supabase } from "./supabase"

export interface BoardRow {
  rank: number
  displayName: string
  finalMoney: number
  daysCompleted: number
  actionsUsed: number
}

export interface BoardPage {
  rows: BoardRow[]
  /** Total verified runs for this balance version, for paging and "of N". */
  total: number
  /** True when Supabase is unreachable or unconfigured. */
  offline: boolean
}

export const PAGE_SIZE = 25

interface RawRow {
  rank: number
  display_name: string
  final_money: number
  days_completed: number
  actions_used: number
}

function mapRow(row: RawRow): BoardRow {
  return {
    rank: row.rank,
    displayName: row.display_name,
    finalMoney: row.final_money,
    daysCompleted: row.days_completed,
    actionsUsed: row.actions_used,
  }
}

/**
 * @param page zero-indexed.
 *
 * Uses an exact count so the page control can show a real total. That is a
 * second scan on very large tables; at leaderboard scale it is cheap and being
 * able to say "of 3,412" is worth it.
 */
export async function fetchBoardPage(page = 0): Promise<BoardPage> {
  if (!hasSupabase || !supabase) {
    return { rows: [], total: 0, offline: true }
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from("season_leaderboard_public")
    .select(
      "rank,display_name,final_money,days_completed,actions_used",
      { count: "exact" },
    )
    .eq("balance_version", BRAND.balanceVersion)
    .order("rank", { ascending: true })
    .range(from, to)

  if (error) {
    // A failed board should degrade to an empty board with a notice, never to a
    // thrown error that blanks the page.
    console.error("leaderboard fetch failed", error.message)
    return { rows: [], total: 0, offline: true }
  }

  return {
    rows: (data ?? []).map((row) => mapRow(row as RawRow)),
    total: count ?? 0,
    offline: false,
  }
}

export interface SubmitResult {
  ok: boolean
  /** Present when the server accepted and verified the run. */
  rank?: number
  message: string
}

export interface RunSubmission {
  seed: string
  finalMoney: number
  daysCompleted: number
  actionsUsed: number
  actionLog: unknown[]
}

/**
 * Submit a finished season for verification.
 *
 * The client sends the seed and the ordered action log, never a trusted score:
 * the server replays the log against the same balance version and stores only
 * the result it reproduced itself.
 */
export async function submitRun(run: RunSubmission): Promise<SubmitResult> {
  if (!hasSupabase || !supabase) {
    return { ok: false, message: "Sign-in is not configured in this build." }
  }

  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    return { ok: false, message: "Sign in to post a score to the board." }
  }

  const { data, error } = await supabase.functions.invoke("verify-season-run", {
    body: { ...run, balanceVersion: BRAND.balanceVersion },
  })

  if (error) {
    return { ok: false, message: error.message || "Verification failed." }
  }

  const result = data as { verified?: boolean; rank?: number; reason?: string }
  if (!result?.verified) {
    return { ok: false, message: result?.reason ?? "The run did not verify." }
  }

  return { ok: true, rank: result.rank, message: "Verified and posted." }
}
