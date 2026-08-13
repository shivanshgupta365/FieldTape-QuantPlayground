import { ChevronDown, Music, Pause, Play, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { TRACKS, ambientEngine, type TrackId } from "../audio/ambient"

const VOLUME_KEY = "alpstead.music.volume"

/**
 * Bottom-right music dock. Collapsed to a single button until opened.
 *
 * Deliberately never autoplays. Browsers block audio without a gesture anyway,
 * but more importantly a game that starts making noise on load is a game people
 * close. The dock persists volume but not playback state, so a reload is always
 * silent until asked.
 */
export function MusicDock() {
  const engine = ambientEngine()
  const [open, setOpen] = useState(false)
  const [track, setTrack] = useState<TrackId | null>(null)
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(saved) && saved > 0 ? saved : 0.5
  })
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    engine.setVolume(volume)
    localStorage.setItem(VOLUME_KEY, String(volume))
  }, [engine, volume])

  // Stop audio if the component unmounts, or a route change leaves it orphaned.
  useEffect(() => () => engine.stop(false), [engine])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onClick)
    }
  }, [open])

  const toggle = useCallback(
    async (id: TrackId) => {
      if (track === id) {
        engine.stop()
        setTrack(null)
        return
      }
      await engine.play(id)
      setTrack(id)
    },
    [engine, track],
  )

  const playing = TRACKS.find((t) => t.id === track)

  return (
    <div className="music-dock" ref={panelRef}>
      {open && (
        <div className="music-panel" role="dialog" aria-label="Music library">
          <header>
            <span>Sound library</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close music library">
              <ChevronDown size={16} />
            </button>
          </header>

          <ul>
            {TRACKS.map((t) => {
              const active = track === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={active ? "active" : undefined}
                    onClick={() => void toggle(t.id)}
                    aria-pressed={active}
                  >
                    <i aria-hidden="true">{active ? <Pause size={13} /> : <Play size={13} />}</i>
                    <span>
                      <strong>{t.title}</strong>
                      <small>{t.blurb}</small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <footer>
            <label>
              <Volume2 size={15} />
              <span className="sr-only">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
            <small>Generated live — never the same twice.</small>
          </footer>
        </div>
      )}

      <button
        type="button"
        className={`music-fab${track ? " playing" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={playing ? `Music: ${playing.title}. Open sound library` : "Open sound library"}
      >
        <Music size={18} />
        {track && <span className="music-bars" aria-hidden="true"><i /><i /><i /></span>}
      </button>
    </div>
  )
}
