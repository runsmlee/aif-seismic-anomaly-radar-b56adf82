interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}

/**
 * Renders a simple inline SVG sparkline from numeric data.
 */
export default function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#d6361f',
  fillOpacity = 0.15,
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <svg
        className="sparkline"
        width={width}
        height={height}
        role="img"
        aria-label="No data available"
      >
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={8} fill="#64748b">
          —
        </text>
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((value, i) => {
    const x = i * step;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(' ');

  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      role="img"
      aria-label={`Trend: ${data[0]} to ${data[data.length - 1]} events per day`}
    >
      <path d={fillPath} fill={color} fillOpacity={fillOpacity} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} />
      )}
    </svg>
  );
}
