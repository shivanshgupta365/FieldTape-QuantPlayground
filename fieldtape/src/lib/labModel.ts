import type { Lab } from "../data/labs";

export type LabResult = {
  primary: string;
  secondary: string;
  tertiary: string;
  verdict: string;
  explanation: string;
  baseline: number[];
  experiment: number[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function runLabModel(lab: Lab, value: number): LabResult {
  const points = Array.from({ length: 16 }, (_, index) => index);

  switch (lab.id) {
    case "capital-lockup": {
      const daysLeft = 31 - value;
      const melonCycles = Math.max(0, Math.floor(daysLeft / 10));
      const wheatCycles = Math.max(0, Math.floor(daysLeft / 2));
      const melon = melonCycles * 170;
      const wheat = wheatCycles * 8;
      const chooseMelon = melon > wheat && daysLeft >= 10;
      return {
        primary: `¢${Math.max(melon, wheat).toLocaleString()}`,
        secondary: `${chooseMelon ? 10 : 2} days`,
        tertiary: daysLeft < 10 ? "¢80" : "¢0",
        verdict: chooseMelon ? "Long-duration capital still has room to clear." : "Liquidity dominates this late in the season.",
        explanation: `Entering on day ${value} leaves ${daysLeft} days. The best headline payout changes once the remaining horizon cannot absorb its lockup.`,
        baseline: points.map((x) => x * 8),
        experiment: points.map((x) => (x < 10 ? -80 : -80 + (x - 9) * 250)),
      };
    }
    case "action-budget": {
      const actions = value + Math.ceil(value * 0.35) + 4;
      const capacity = 48;
      const slack = capacity - actions;
      const miss = clamp(Math.round(((actions - 38) / 24) * 100), 0, 96);
      return {
        primary: `${actions} / day`,
        secondary: `${slack >= 0 ? "+" : ""}${slack} moves`,
        tertiary: `${miss}%`,
        verdict: slack >= 5 ? "The plan has operating slack." : slack >= 0 ? "Profitable, but fragile to routing noise." : "The field is larger than the workforce can service.",
        explanation: `${value} planted tiles require watering plus harvest and route overhead. Capacity, not cash, is the binding constraint.`,
        baseline: points.map((x) => x * 3),
        experiment: points.map((x) => Math.min(capacity, x * (actions / 16))),
      };
    }
    case "season-wall": {
      const left = 31 - value;
      const cycles = Math.floor(left / 2);
      const stranded = left < 10 ? 80 : 0;
      return {
        primary: `${cycles} wheat`,
        secondary: `¢${cycles * 8}`,
        tertiary: `¢${stranded}`,
        verdict: left >= 10 ? "Slow assets can still mature." : "The opportunity set has contracted to fast crops.",
        explanation: `At day ${value}, only ${left} days remain. An asset whose first cash flow arrives after the wall has negative realized return.`,
        baseline: points.map((x) => x * 8),
        experiment: points.map((x) => (x < 10 ? -80 : 170)),
      };
    }
    case "market-impact": {
      const startPrice = 120;
      const impact = Math.pow(value / 80, 1.35) * 46;
      const avg = startPrice - impact / 2;
      const net = Math.round(avg * value);
      return {
        primary: `¢${avg.toFixed(1)}`,
        secondary: `−${impact.toFixed(1)}¢`,
        tertiary: `¢${net.toLocaleString()}`,
        verdict: value > 45 ? "One large order walks down its own price." : "The market absorbs this order with moderate slippage.",
        explanation: `The quote starts at ¢${startPrice}, but a ${value}-unit sale executes along a curve. Splitting an order can matter when town demand refreshes.`,
        baseline: points.map((x) => 120 - x * 0.7),
        experiment: points.map((x) => 120 - x * (impact / 15)),
      };
    }
    case "variance": {
      const pWinSafe = clamp(50 + value / 45, 4, 96);
      const behind = value < 0;
      const pWinRisky = clamp(50 + value / 105, 12, 88);
      return {
        primary: "¢10,000",
        secondary: behind ? "High" : "Low",
        tertiary: `${Math.round(behind ? pWinRisky : pWinSafe)}%`,
        verdict: behind ? "Add variance: a narrow loss and a large loss rate the same." : "Cut variance: protect the probability of any positive finish.",
        explanation: `Both plans have the same expected terminal coins. With a ${value >= 0 ? "+" : ""}${value}-coin lead, their probability of clearing the opponent differs.`,
        baseline: points.map((x) => 10000 + (x - 8) * 130),
        experiment: points.map((x) => 10000 + (x - 8) * 520),
      };
    }
    default: {
      const confidence = clamp(value, 0, 100);
      const candidates = Math.max(2, Math.round(12 - confidence / 10));
      return {
        primary: `${candidates}`,
        secondary: `${confidence}%`,
        tertiary: confidence > 70 ? "Targeted" : "Robust",
        verdict: confidence > 70 ? "The evidence supports a narrower response." : "Prefer an action that survives several hidden states.",
        explanation: "Cash, inventory, and shared-market changes eliminate some explanations, but never reveal the opponent’s full private shed.",
        baseline: points.map((x) => 30 + x * 2),
        experiment: points.map((x) => Math.min(100, confidence * (1 - Math.exp(-x / 6)))),
      };
    }
  }
}

