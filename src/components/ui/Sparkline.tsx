import { useId } from "react";

const W = 72;
const H = 26;

/** A week of prices as a tiny line, green when it ended higher and red when lower. */
export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const id = useId();
  const min = Math.min(...points);
  const max = Math.max(...points);
  if (points.length < 2 || max - min < max * 1e-6) {
    return <span className={className} aria-hidden />;
  }
  const x = (i: number) => (i / (points.length - 1)) * (W - 4) + 2;
  const y = (v: number) => H - 3 - ((v - min) / (max - min)) * (H - 6);
  const line = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const color = points[points.length - 1] >= points[0] ? "var(--gain)" : "var(--loss)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line}L${x(points.length - 1)},${H}L${x(0)},${H}Z`} fill={`url(#${id})`} className="fade-in" />
      <path
        d={line}
        pathLength={1}
        strokeDasharray={1}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="draw-line"
      />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={2.25} fill={color} className="fade-in" />
    </svg>
  );
}
