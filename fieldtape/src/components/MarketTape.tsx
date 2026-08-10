import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export type MarketQuote = { symbol: string; label: string; price: number; change: number };

export const demoQuotes: readonly MarketQuote[] = [
  { symbol: "WHT", label: "Wheat", price: 18, change: 1.2 },
  { symbol: "CRT", label: "Carrot", price: 42, change: -2.1 },
  { symbol: "TOM", label: "Tomato", price: 76, change: 3.8 },
  { symbol: "STR", label: "Strawberry", price: 112, change: -0.7 },
  { symbol: "MLN", label: "Melon", price: 237, change: 5.4 },
];

export function MarketTape({ quotes = demoQuotes, compact = false }: { quotes?: readonly MarketQuote[]; compact?: boolean }) {
  return (
    <section className={compact ? "market-tape compact" : "market-tape"} aria-label="Shared market quotes">
      <header><span>SHARED MARKET</span><small>town demand + both farms</small></header>
      <div className="quote-row">
        {quotes.map((quote) => (
          <div className="quote" key={quote.symbol} title={quote.label}>
            <span>{quote.symbol}</span>
            <b>¢{quote.price.toFixed(0)}</b>
            <em className={quote.change >= 0 ? "up" : "down"}>
              {quote.change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(quote.change).toFixed(1)}%
            </em>
          </div>
        ))}
      </div>
    </section>
  );
}

