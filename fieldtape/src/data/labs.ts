export type Lab = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  question: string;
  thesis: string;
  concept: string;
  accent: "gold" | "cyan" | "red" | "green";
  metric: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  outcomes: readonly string[];
};

export const labs: readonly Lab[] = [
  {
    id: "capital-lockup",
    number: "01",
    title: "Capital lockup & payback",
    shortTitle: "Capital lockup",
    question: "When does the highest payout become the wrong purchase?",
    thesis: "Compare assets by cash-flow timing, not by the size of the final harvest.",
    concept: "Payback period · cash-flow profile · opportunity cost",
    accent: "gold",
    metric: "Season day",
    unit: "day",
    defaultValue: 4,
    min: 1,
    max: 27,
    step: 1,
    outcomes: ["Cash returned", "Days locked", "Terminal value"],
  },
  {
    id: "action-budget",
    number: "02",
    title: "The binding action budget",
    shortTitle: "Action budget",
    question: "How much farm can one worker actually service?",
    thesis: "A profitable field on paper can fail when maintenance consumes every move.",
    concept: "Capacity constraint · execution cost · utilization",
    accent: "cyan",
    metric: "Planted tiles",
    unit: "tiles",
    defaultValue: 18,
    min: 4,
    max: 64,
    step: 1,
    outcomes: ["Actions required", "Slack remaining", "Miss probability"],
  },
  {
    id: "season-wall",
    number: "03",
    title: "Duration & the season wall",
    shortTitle: "Season wall",
    question: "What can still mature before day thirty?",
    thesis: "The opportunity set contracts as the terminal date approaches.",
    concept: "Duration matching · finite horizon · liquidation",
    accent: "red",
    metric: "Entry day",
    unit: "day",
    defaultValue: 18,
    min: 1,
    max: 30,
    step: 1,
    outcomes: ["Cycles remaining", "Realized coins", "Stranded capital"],
  },
  {
    id: "market-impact",
    number: "04",
    title: "Market impact & slippage",
    shortTitle: "Market impact",
    question: "Why can selling more make each unit worth less?",
    thesis: "Orders move a shared price curve; marginal revenue matters more than the headline quote.",
    concept: "Price impact · slippage · marginal revenue",
    accent: "cyan",
    metric: "Order size",
    unit: "units",
    defaultValue: 22,
    min: 1,
    max: 80,
    step: 1,
    outcomes: ["Average price", "Market impact", "Net proceeds"],
  },
  {
    id: "variance",
    number: "05",
    title: "Variance when margin is discarded",
    shortTitle: "Win probability",
    question: "Would you rather earn more on average—or win more often?",
    thesis: "When only win, loss, or tie matters, the preferred variance depends on the score state.",
    concept: "P(win) · variance · asymmetric objective",
    accent: "red",
    metric: "Current lead",
    unit: "coins",
    defaultValue: 200,
    min: -2000,
    max: 2000,
    step: 100,
    outcomes: ["Expected coins", "Outcome spread", "Estimated P(win)"],
  },
  {
    id: "beliefs",
    number: "06",
    title: "Beliefs under hidden inventory",
    shortTitle: "Opponent beliefs",
    question: "What can public cash flows reveal about a private shed?",
    thesis: "Maintain multiple plausible states, then update them as money and markets move.",
    concept: "Partial observability · Bayesian update · game theory",
    accent: "green",
    metric: "Signal strength",
    unit: "%",
    defaultValue: 55,
    min: 0,
    max: 100,
    step: 5,
    outcomes: ["Candidate states", "Posterior confidence", "Robust action"],
  },
];

export const labById = (id: string | undefined) => labs.find((lab) => lab.id === id);

