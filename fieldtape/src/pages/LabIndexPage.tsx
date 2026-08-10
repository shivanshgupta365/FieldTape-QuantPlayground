import { ArrowRight, CheckCircle2, Circle, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";
import { labs } from "../data/labs";

export function LabIndexPage() {
  return (
    <div className="page lab-index-page">
      <PageHeader
        eyebrow="THE FIELD MANUAL / SIX EXPERIMENTS"
        title="Quant ideas you can touch."
        dek="Each lab starts with a falsifiable prediction. Move one assumption, run a deterministic scenario, then inspect why the result changed."
        aside={<div className="completion-stamp"><span>LOCAL PROGRESS</span><strong>0 / {labs.length}</strong><small>sync is optional</small></div>}
      />
      <SectionRule index="A" label="CORE CURRICULUM" value="~45 MINUTES" />
      <div className="lab-catalog">
        {labs.map((lab, index) => (
          <Link className={`lab-catalog-item accent-${lab.accent}`} to={`/lab/${lab.id}`} key={lab.id}>
            <div className="lab-catalog-number">{lab.number}</div>
            <div className="lab-catalog-copy">
              <p>{lab.concept}</p>
              <h2>{lab.title}</h2>
              <span>{lab.question}</span>
            </div>
            <div className="lab-catalog-status">
              {index === -1 ? <CheckCircle2 /> : <Circle />}
              <small>NOT STARTED</small>
              <ArrowRight className="lab-arrow" />
            </div>
          </Link>
        ))}
      </div>
      <section className="research-callout">
        <FlaskConical size={28} />
        <div><p className="eyebrow">AFTER THE MANUAL</p><h2>Build your own hypothesis.</h2><p>Combine asset, workforce, market, and horizon assumptions in the research notebook.</p></div>
        <Link className="button button-outline" to="/research">Open research desk <ArrowRight size={15} /></Link>
      </section>
    </div>
  );
}

