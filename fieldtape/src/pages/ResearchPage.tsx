import { Download, FlaskConical, Loader2, Play, RotateCcw, Save } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { LineChart } from "../components/LineChart"
import { PageHeader } from "../components/PageHeader"
import { SectionRule } from "../components/SectionRule"
import { saveNotebook } from "../lib/persistence"
import { runScenario, type RunResult, type Scenario } from "../lib/researchSim"

/**
 * Starting plan: deliberately mid-table, not optimal.
 *
 * Measured over 64 seasons: slow-crop bias is by far the dominant lever
 * (bias 30 -> ~3,200 coins and 0% wins; bias 70 -> ~24,000 and 94%). Shipping the
 * optimum as the default would hand the player the answer; shipping a guaranteed
 * loser is a bad first impression. This sits between the two so the first slider
 * drag actually teaches something.
 */
const initial: Scenario = { horizon: 30, tiles: 16, workers: 2, premium: 50, impact: 60 }
const EPISODES = 64

export function ResearchPage() {
  const [scenario, setScenario] = useState(initial)
  const [hypothesis, setHypothesis] = useState(
    "Adding a second worker before expanding the field will improve terminal coins and reduce missed watering.",
  )
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [runs, setRuns] = useState(0)
  const [saved, setSaved] = useState(false)
  const cancelRef = useRef(false)

  const utilization = Math.min(
    400,
    Math.round(((scenario.tiles * 1.35) / (scenario.workers * 24)) * 100),
  )

  const run = useCallback(async () => {
    if (running) {
      cancelRef.current = true
      return
    }
    cancelRef.current = false
    setRunning(true)
    setProgress(0)
    setSaved(false)
    const outcome = await runScenario(scenario, EPISODES, (fraction) => {
      setProgress(fraction)
      return !cancelRef.current
    })
    setResult(outcome)
    setRuns((n) => n + 1)
    setRunning(false)
  }, [scenario, running])

  const update = (key: keyof Scenario, value: number) => {
    setScenario((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    if (!result) return
    await saveNotebook({
      title: `Research run ${runs}`,
      hypothesis,
      parameters: { ...scenario },
      result: `Terminal median ¢${result.terminal.median}; win rate ${Math.round(result.winRate * 100)}%; ${result.episodes} episodes`,
    })
    setSaved(true)
  }

  const exportRun = () => {
    if (!result) return
    const payload = {
      schema: "AlpsteadNotebookV1",
      hypothesis,
      parameters: { ...scenario },
      episodes: result.episodes,
      diagnostics: {
        terminal: result.terminal,
        winRate: result.winRate,
        meanCropsLost: result.meanCropsLost,
        meanDrawdown: result.meanDrawdown,
      },
      medianPath: result.median,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "alpstead-notebook.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page research-page">
      <PageHeader
        eyebrow="Research desk"
        title="Write the claim before the chart."
        dek={`Set a plan, commit to a hypothesis, then run ${EPISODES} full seasons of the real engine and find out.`}
        aside={
          <div className="seed-chip">
            <span>Episodes per run</span>
            <strong>{EPISODES}</strong>
          </div>
        }
      />

      <div className="research-layout">
        <section className="research-controls">
          <SectionRule index="1" label="HYPOTHESIS" />
          <label className="hypothesis-field">
            <span>What do you expect, and why?</span>
            <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={4} />
          </label>

          <SectionRule index="2" label="PLAN" />
          <div className="parameter-list">
            {(
              [
                ["horizon", "Plan for days", 6, 30, "days"],
                ["tiles", "Target planted tiles", 2, 40, "tiles"],
                ["workers", "Hire up to", 1, 4, "workers"],
                ["premium", "Slow-crop bias", 0, 100, "%"],
                ["impact", "Sell aggression", 0, 100, "%"],
              ] as const
            ).map(([key, label, min, max, unit]) => (
              <label key={key}>
                <span>
                  {label}
                  <output>
                    {scenario[key]} {unit}
                  </output>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={scenario[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>

          <div className="research-buttons">
            <button className="button button-dark" onClick={() => void run()}>
              {running ? (
                <>
                  <Loader2 size={15} className="spin" /> Cancel ({Math.round(progress * 100)}%)
                </>
              ) : (
                <>
                  <Play size={15} fill="currentColor" /> Run {EPISODES} seasons
                </>
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Reset plan"
              onClick={() => setScenario(initial)}
            >
              <RotateCcw size={17} />
            </button>
          </div>

          {running && (
            <div className="research-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
              <i style={{ width: `${progress * 100}%` }} />
            </div>
          )}

          <p className="research-hint">
            Worker utilisation for this plan:{" "}
            <b className={utilization > 100 ? "danger" : undefined}>{utilization}%</b>
            {utilization > 100 && " — this plan asks for more moves than the workforce has."}
          </p>
        </section>

        <section className="research-output">
          <header>
            <div>
              <span>Bank balance by day</span>
              <small>
                {result
                  ? `median with 10th–90th percentile band, ${result.episodes} episodes`
                  : "no run yet"}
              </small>
            </div>
            <b>RUN {String(runs).padStart(3, "0")}</b>
          </header>

          {result ? (
            <>
              <LineChart
                height={300}
                series={[
                  { label: "90th percentile", color: "#9fc7a0", values: result.high },
                  { label: "Median", color: "#e7a72f", values: result.median },
                  { label: "10th percentile", color: "#d85843", values: result.low },
                ]}
              />

              <dl className="research-metrics">
                <div>
                  <dt>Terminal median</dt>
                  <dd>¢{result.terminal.median.toLocaleString()}</dd>
                  <small>
                    ¢{result.terminal.low.toLocaleString()} – ¢
                    {result.terminal.high.toLocaleString()}
                  </small>
                </div>
                <div className={result.winRate < 0.5 ? "danger" : ""}>
                  <dt>Beat the baseline</dt>
                  <dd>{Math.round(result.winRate * 100)}%</dd>
                  <small>of {result.episodes} seasons</small>
                </div>
                <div className={result.meanCropsLost > 3 ? "danger" : ""}>
                  <dt>Crops lost</dt>
                  <dd>{result.meanCropsLost.toFixed(1)}</dd>
                  <small>mean per season, to drying out</small>
                </div>
              </dl>

              <div className="diagnostic-note">
                <FlaskConical size={18} />
                <p>
                  <strong>Diagnostic.</strong>{" "}
                  {result.meanCropsLost > 3
                    ? `This plan loses ${result.meanCropsLost.toFixed(1)} tiles a season to thirst. You are planting more than you can water.`
                    : result.winRate < 0.5
                      ? "The plan is well-run but loses more often than it wins. The problem is the portfolio, not the execution."
                      : `Holds up: ${Math.round(result.winRate * 100)}% of seasons finish ahead, with the crop losses under control.`}
                </p>
              </div>

              <div className="output-actions">
                <button onClick={() => void save()} disabled={saved}>
                  <Save size={15} /> {saved ? "Saved" : "Save run"}
                </button>
                <button onClick={exportRun}>
                  <Download size={15} /> Export JSON
                </button>
              </div>
            </>
          ) : (
            <div className="research-empty">
              <FlaskConical size={26} />
              <h2>Nothing run yet</h2>
              <p>
                Set a plan on the left, then run {EPISODES} full seasons. Every number that
                appears here comes out of the same engine you play.
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="model-caveat">
        These are real episodes of the shipped engine against the public baseline, not a
        fitted curve. Results depend on the current balance table.
      </p>
    </div>
  )
}
