import { ArrowLeft, ArrowRight, Check, RotateCcw, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LineChart } from "../components/LineChart";
import { SectionRule } from "../components/SectionRule";
import { labById, labs } from "../data/labs";
import { runLabModel } from "../lib/labModel";
import { saveModuleProgress } from "../lib/persistence";

export function LabModulePage() {
  const { moduleId } = useParams();
  const lab = labById(moduleId);
  const [value, setValue] = useState(lab?.defaultValue ?? 0);
  const [prediction, setPrediction] = useState<"increase" | "decrease" | "unchanged" | null>(null);
  const [ran, setRan] = useState(false);
  const [saved, setSaved] = useState(false);
  const result = useMemo(() => (lab ? runLabModel(lab, value) : null), [lab, value]);

  if (!lab || !result) return <Navigate to="/lab" replace />;
  const index = labs.findIndex((item) => item.id === lab.id);
  const next = labs[(index + 1) % labs.length]!;

  const saveProgress = async () => {
    await saveModuleProgress({ moduleId: lab.id, masteryScore: prediction ? 100 : 70 });
    setSaved(true);
  };

  return (
    <div className={`page lab-module-page accent-${lab.accent}`}>
      <Link className="back-link" to="/lab"><ArrowLeft size={14} /> All labs</Link>
      <header className="module-header">
        <div><p className="eyebrow">LAB {lab.number} / {lab.concept}</p><h1>{lab.title}</h1><p>{lab.question}</p></div>
        <div className="module-index"><span>{lab.number}</span><small>OF {labs.length.toString().padStart(2, "0")}</small></div>
      </header>

      <div className="module-layout">
        <aside className="module-theory">
          <SectionRule index="1" label="FRAME" />
          <h2>The working idea</h2>
          <p>{lab.thesis}</p>
          <div className="formula-block">
            <span>OBJECTIVE</span>
            <code>{lab.id === "variance" ? "P(win) + ½P(tie)" : lab.id === "market-impact" ? "Σ qᵢ · p(qᵢ)" : "realized cash ÷ constrained resource"}</code>
          </div>
          <p className="theory-note"><Sparkles size={15} /> This is a toy simulation concept—not a claim about a real security or market.</p>
        </aside>

        <section className="experiment-panel">
          <SectionRule index="2" label="PREDICT" />
          <h2>Before you run it</h2>
          <p>If <strong>{lab.metric.toLowerCase()}</strong> moves to <b>{value.toLocaleString()} {lab.unit}</b>, what happens to the preferred plan?</p>
          <div className="prediction-buttons" role="group" aria-label="Prediction">
            {(["increase", "decrease", "unchanged"] as const).map((choice) => <button className={prediction === choice ? "active" : undefined} key={choice} onClick={() => setPrediction(choice)}>{prediction === choice && <Check size={14} />}{choice}</button>)}
          </div>

          <SectionRule index="3" label="STRESS THE ASSUMPTION" />
          <div className="parameter-control">
            <label htmlFor="lab-value"><span>{lab.metric}</span><output>{value.toLocaleString()} <small>{lab.unit}</small></output></label>
            <input id="lab-value" type="range" min={lab.min} max={lab.max} step={lab.step} value={value} onChange={(event) => { setValue(Number(event.target.value)); setRan(false); setSaved(false); }} />
            <div><span>{lab.min} {lab.unit}</span><span>{lab.max} {lab.unit}</span></div>
          </div>
          <button className="button button-dark run-button" onClick={() => setRan(true)}>Run seeded experiment <ArrowRight size={15} /></button>
        </section>

        <section className={ran ? "result-panel is-visible" : "result-panel"} aria-live="polite">
          <SectionRule index="4" label="DIAGNOSTIC" value={ran ? "RUN COMPLETE" : "WAITING"} />
          {!ran ? (
            <div className="result-empty"><span>∿</span><h2>No run yet</h2><p>Make a prediction and execute the scenario to reveal the diagnostic.</p></div>
          ) : (
            <>
              <div className="result-verdict"><span>MODEL READ</span><h2>{result.verdict}</h2><p>{result.explanation}</p></div>
              <dl className="result-metrics">
                {lab.outcomes.map((outcome, resultIndex) => <div key={outcome}><dt>{outcome}</dt><dd>{[result.primary, result.secondary, result.tertiary][resultIndex]}</dd></div>)}
              </dl>
              <LineChart height={180} series={[
                { label: "Reference", color: "#858174", values: result.baseline },
                { label: "Experiment", color: lab.accent === "cyan" ? "#41b7ba" : lab.accent === "red" ? "#d85843" : lab.accent === "green" ? "#63895a" : "#e7a72f", values: result.experiment },
              ]} />
              <button className="button button-outline save-run" onClick={saveProgress}>{saved ? <Check size={15} /> : <Save size={15} />}{saved ? "Saved locally" : "Save to field notes"}</button>
            </>
          )}
        </section>
      </div>

      <footer className="module-footer">
        <button onClick={() => { setValue(lab.defaultValue); setPrediction(null); setRan(false); }}><RotateCcw size={14} /> Reset lab</button>
        <Link to={`/lab/${next.id}`}>Next: {next.shortTitle} <ArrowRight size={15} /></Link>
      </footer>
    </div>
  );
}

