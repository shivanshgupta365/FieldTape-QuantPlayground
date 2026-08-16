import { ChevronLeft, ChevronRight, Medal, ShieldCheck, Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { PageHeader } from "../components/PageHeader"
import { BRAND } from "../brand"
import { PAGE_SIZE, fetchBoardPage, type BoardRow } from "../lib/leaderboard"

export function LeaderboardPage() {
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<BoardRow[]>([])
  const [total, setTotal] = useState(0)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = () => fetchBoardPage(page).then((result) => {
      // Guard against a stale response landing after a newer page request.
      if (cancelled) return
      setRows(result.rows)
      setTotal(result.total)
      setOffline(result.offline)
      setLoading(false)
    })
    setLoading(true)
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showing = rows.length
    ? `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + rows.length} of ${total.toLocaleString()}`
    : "—"

  return (
    <div className="page leaderboard-page">
      <PageHeader
        eyebrow="Season board"
        title="Thirty days. One bank balance."
        dek="Every score here was replayed on the server from the player's own action log before it was allowed on the board."
        aside={
          <div className="verification-badge">
            <ShieldCheck />
            <span>Verification</span>
            <strong>{offline ? "Offline" : "Server-replayed"}</strong>
          </div>
        }
      />

      <div className="board-meta">
        <span className="board-balance">
          Balance <code>{BRAND.balanceVersion}</code>
        </span>
        <span>{showing}</span>
      </div>

      {offline && (
        <div className="demo-banner">
          <span>No connection</span> The board could not be reached. Scores are stored on
          the server, so nothing is lost — reload to try again.
        </div>
      )}

      {loading ? (
        <div className="board-skeleton" role="status" aria-live="polite">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="board-skeleton-row" />
          ))}
          <span className="sr-only">Loading the board</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="board-empty">
          <Trophy size={26} />
          <h2>No verified seasons yet</h2>
          <p>
            Finish a full thirty-day season and post it. The first verified run takes
            the top of the board.
          </p>
        </div>
      ) : (
        <>
          <div className="leaderboard-table" role="table" aria-label="Season leaderboard">
            <div className="leaderboard-head" role="row">
              <span>Rank</span>
              <span>Player</span>
              <span>Final bank</span>
              <span>Days</span>
              <span>Actions</span>
            </div>
            {rows.map((row) => (
              <div role="row" key={`${row.rank}-${row.displayName}`} className={row.rank <= 3 ? "podium" : undefined}>
                <span>
                  {row.rank <= 3 && <Medal size={14} />}
                  {String(row.rank).padStart(2, "0")}
                </span>
                <strong>{row.displayName}</strong>
                <b>¢{row.finalMoney.toLocaleString()}</b>
                <span>{row.daysCompleted} / 30</span>
                <span>{row.actionsUsed.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <nav className="board-pager" aria-label="Board pages">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span>
              Page {page + 1} of {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
            >
              Next <ChevronRight size={15} />
            </button>
          </nav>
        </>
      )}

      <div className="leaderboard-method">
        <h2>What “verified” means</h2>
        <p>
          The game sends the seed and the ordered list of moves — never a score. The
          server replays that list against the same balance table and stores only the
          number it reproduced itself. An edited score does not replay, so it does not
          appear.
        </p>
        <code>score = replay(seed, actions, {BRAND.balanceVersion})</code>
      </div>
    </div>
  )
}
