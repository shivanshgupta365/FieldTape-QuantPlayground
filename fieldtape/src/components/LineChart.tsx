type Series = { label: string; values: readonly number[]; color: string };

function path(values: readonly number[], width: number, height: number, min: number, max: number) {
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / Math.max(1, max - min)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function LineChart({ series, height = 160, marker }: { series: readonly Series[]; height?: number; marker?: number }) {
  const width = 600;
  const values = series.flatMap((item) => [...item.values]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const markerX = marker === undefined ? undefined : Math.max(0, Math.min(1, marker)) * width;

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={series.map((item) => item.label).join(" and ") + " over time"}>
        {[0.25, 0.5, 0.75].map((position) => <line key={position} x1="0" x2={width} y1={height * position} y2={height * position} className="chart-grid" />)}
        <line x1="0" x2={width} y1={height - 1} y2={height - 1} className="chart-axis" />
        {series.map((item) => <path key={item.label} d={path(item.values, width, height, min, max)} fill="none" stroke={item.color} strokeWidth="3" vectorEffect="non-scaling-stroke" />)}
        {markerX !== undefined && <line x1={markerX} x2={markerX} y1="0" y2={height} className="chart-marker" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="chart-legend">
        {series.map((item) => <span key={item.label}><i style={{ backgroundColor: item.color }} />{item.label}</span>)}
      </div>
    </div>
  );
}

