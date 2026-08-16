import { ArrowUpRight, BookOpen, ExternalLink, FlaskConical, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionRule } from "../components/SectionRule";

type Resource = { title: string; note: string; href: string; kind: "Website" | "Video" | "Book" };

const shelves: Array<{ title: string; index: string; intro: string; resources: Resource[] }> = [
  { index: "01", title: "Crash learn", intro: "A short, practical route into the ideas you will touch in a first FieldTape season.", resources: [
    { kind: "Website", title: "Khan Academy — microeconomics", note: "Supply, demand, opportunity cost, and market incentives.", href: "https://www.khanacademy.org/economics-finance-domain/microeconomics" },
    { kind: "Video", title: "MIT OpenCourseWare — Introduction to Computer Science", note: "A primer on algorithms, models, and computational thinking.", href: "https://ocw.mit.edu/courses/6-100a-introduction-to-computer-science-and-programming-in-python-fall-2022/" },
    { kind: "Book", title: "The Undercover Economist — Tim Harford", note: "Everyday incentives and price signals without a finance background.", href: "https://www.penguinrandomhouse.com/books/296594/the-undercover-economist-by-tim-harford/" },
  ] },
  { index: "02", title: "Building fundamentals", intro: "Build the vocabulary for allocating capital, reading uncertainty, and testing a decision.", resources: [
    { kind: "Website", title: "OpenStax — Principles of Economics", note: "Free reference for markets, costs, risk, and decision-making.", href: "https://openstax.org/details/books/principles-economics-3e" },
    { kind: "Video", title: "MIT OpenCourseWare — Probability and Statistics", note: "How to reason about variance, distributions, and evidence.", href: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/" },
    { kind: "Book", title: "Thinking in Bets — Annie Duke", note: "Separate good decisions from lucky outcomes.", href: "https://www.penguinrandomhouse.com/books/555240/thinking-in-bets-by-annie-duke/" },
  ] },
  { index: "03", title: "Awareness", intro: "Keep the wider system in view: food, climate, data, and the limits of a simplified simulation.", resources: [
    { kind: "Website", title: "FAO — Food and Agriculture Organization", note: "Primary-source context on global food systems and resilience.", href: "https://www.fao.org/home/en" },
    { kind: "Video", title: "Our World in Data — Food and Agriculture", note: "Charts and explainers for checking claims against public evidence.", href: "https://ourworldindata.org/food-agriculture" },
    { kind: "Book", title: "The Uninhabitable Earth — David Wallace-Wells", note: "Climate risk and second-order effects.", href: "https://www.penguinrandomhouse.com/books/563900/the-uninhabitable-earth-by-david-wallace-wells/" },
  ] },
];
const icons = { Website: ExternalLink, Video: PlayCircle, Book: BookOpen };

export function LearnPage() {
  return <div className="page learn-page">
    <PageHeader eyebrow="FIELD NOTES / LEARN" title="Learn the system. Then test it." dek="A compact shelf of public resources for understanding the choices behind each FieldTape season." />
    <SectionRule index="L" label="THREE READING PATHS" value="READ · WATCH · APPLY" />
    <div className="learn-shelves">{shelves.map((shelf) => <section className="learn-shelf" key={shelf.title}>
      <header><span>{shelf.index}</span><div><p className="eyebrow">RESOURCE PATH</p><h2>{shelf.title}</h2><p>{shelf.intro}</p></div></header>
      <div className="learn-resource-list">{shelf.resources.map((resource) => { const Icon = icons[resource.kind]; return <a href={resource.href} target="_blank" rel="noreferrer" key={resource.title}><Icon size={18} /><span><small>{resource.kind}</small><strong>{resource.title}</strong><em>{resource.note}</em></span><ArrowUpRight size={16} /></a>; })}</div>
    </section>)}</div>
    <section className="learn-labs-callout"><FlaskConical size={30} /><div><p className="eyebrow">PUT IT TO WORK</p><h2>Run the six interactive labs.</h2><p>Make a prediction, change one input, and inspect the deterministic result.</p></div><Link className="button button-outline" to="/lab">Open lab manual <ArrowUpRight size={15} /></Link></section>
  </div>;
}
