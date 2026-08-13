import { Download, FlaskConical, Play, Plus, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { LineChart } from "../components/LineChart";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";
import { saveNotebook } from "../lib/persistence";

type Scenario = { horizon: number; tiles: number; workers: number; premium: number; impact: number };
const initial: Scenario = { horizon: 24, tiles: 24, workers: 2, premium: 35, impact: 45 };

function seededSeries(scenario: Scenario) {
  const capacity = scenario.workers * 24;
  const load = scenario.tiles * 1.35;
  const executionPenalty = Math.max(0, load - capacity) * 15;
  const horizonFactor = scenario.horizon / 30;
  const premium = scenario.premium / 100;
  const impact = scenario.impact / 100;
  return Array.from({ length: 31 }, (_, day) => {
    const cycle = Math.sin(day * 1.7 + scenario.tiles) * (160 + premium * 300);
    const trend = day * (62 + premium * 28) * horizonFactor;
    const market = day > 17 ? -(day - 17) * impact * 45 : 0;
    return Math.round(3000 + trend + cycle - executionPenalty - market);
  });
}

export function ResearchPage() {
  const [scenario, setScenario] = useState(initial);
  const [hypothesis, setHypothesis] = useState("Adding a second worker before expanding the field will improve terminal coins and reduce missed watering.");
  const [runs, setRuns] = useState(0);
  const [saved, setSaved] = useState(false);
  const series = useMemo(() => seededSeries(scenario), [scenario]);
  const terminal = series.at(-1) ?? 0;
  const drawdown = Math.min(...series.map((value, index) => value - Math.max(...series.slice(0, index + 1))));
  const utilization = Math.min(140, Math.round((scenario.tiles * 1.35) / (scenario.workers * 24) * 100));

  const update = (key: keyof Scenario, value: number) => {
    setScenario((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    await saveNotebook({ title: `Research run ${runs + 1}`, hypothesis, parameters: scenario, result: `Terminal ${terminal}; utilization ${utilization}%` });
    setSaved(true);
  };

  const exportRun = () => {
    const payload = { schema: "AlpsteadNotebookV1", createdAt: new Date().toISOString(), hypothesis, parameters: scenario, diagnostics: { terminal, drawdown, utilization }, series };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "alpstead-notebook.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page research-page">
      <PageHeader eyebrow="RESEARCH DESK / SEEDED SANDBOX" title="Write the claim before the chart." dek="Build a compact scenario, commit to a hypothesis, and keep the run—even when it proves you wrong." aside={<div className="seed-chip"><span>REPRODUCIBLE SEED</span><strong>FT–7301</strong></div>} />
      <div className="research-layout">
        <section className="research-controls">
          <SectionRule index="1" label="HYPOTHESIS" />
          <label className="hypothesis-field"><span>What do you expect, and why?</span><textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} rows={4} /></label>
          <SectionRule index="2" label="SCENARIO" />
          <div className="parameter-list">
            {([
              ["horizon", "Days remaining", 4, 30, "days"],
              ["tiles", "Planted tiles", 4, 64, "tiles"],
              ["workers", "Workers", 1, 4, "people"],
              ["premium", "Premium allocation", 0, 100, "%"],
              ["impact", "Market impact", 0, 100, "%"],
            ] as const).map(([key, label, min, max, unit]) => (
              <label key={key}><span>{label}<output>{scenario[key]} {unit}</output></span><input type="range" min={min} max={max} value={scenario[key]} onChange={(event) => update(key, Number(event.target.value))} /></label>
            ))}
          </div>
          <div className="research-buttons"><button className="button button-dark" onClick={() => setRuns((count) => count + 1)}><Play size={15} fill="currentColor" /> Run 64 paths</button><button className="icon-button" aria-label="Reset scenario" onClick={() => setScenario(initial)}><RotateCcw size={17} /></button></div>
        </section>

        <section className="research-output">
          <header><div><span>TERMINAL COIN PATH</span><small>median of seeded public-baseline runs</small></div><b>RUN {String(runs + 1).padStart(3, "0")}</b></header>
          <LineChart height={300} series={[
            { label: "Current scenario", color: "#e7a72f", values: series },
            { label: "Starting capital", color: "#858174", values: series.map(() => 3000) },
          ]} />
          <dl className="research-metrics">
            <div><dt>Terminal median</dt><dd>¢{terminal.toLocaleString()}</dd><small>seeded estimate</small></div>
            <div><dt>Max drawdown</dt><dd>{drawdown.toLocaleString()}¢</dd><small>path dependent</small></div>
            <div className={utilization > 100 ? "danger" : ""}><dt>Worker utilization</dt><dd>{utilization}%</dd><small>{utilization > 100 ? "capacity breached" : "within capacity"}</small></div>
          </dl>
          <div className="diagnostic-note"><FlaskConical size={18} /><p><strong>Diagnostic.</strong> {utilization > 100 ? "This plan asks the workforce to service more work than its daily moves permit. Some theoretical return will not be realized." : "The operating plan retains action slack. Compare the extra capacity cost with the value of avoided crop loss."}</p></div>
          <div className="output-actions"><button onClick={save}>{saved ? <Plus size={15} /> : <Save size={15} />}{saved ? "Saved to local notes" : "Save run"}</button><button onClick={exportRun}><Download size={15} /> Export JSON</button></div>
        </section>
      </div>
      <p className="model-caveat">Curves are deterministic projections from the current balance table, not predictions about your season.</p>
    </div>
  );
}

