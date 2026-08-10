export type Stat = { label: string; value: string; delta?: string; tone?: "positive" | "negative" | "neutral" };

export function StatStrip({ stats, compact = false }: { stats: readonly Stat[]; compact?: boolean }) {
  return (
    <dl className={compact ? "stat-strip compact" : "stat-strip"}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
          {stat.delta && <small className={stat.tone ?? "neutral"}>{stat.delta}</small>}
        </div>
      ))}
    </dl>
  );
}

