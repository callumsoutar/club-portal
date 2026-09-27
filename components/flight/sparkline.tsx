import { cn } from "@/lib/flight/utils";

interface SparklineProps {
  data: { date: string; count: number }[];
  className?: string;
  height?: number;
}

/**
 * Dependency-free sparkline.
 *
 * A charting library for one 14-point trend line would be several hundred
 * kilobytes to draw a path we can express in a dozen lines — and this one
 * renders on the server with no hydration cost at all.
 */
export function Sparkline({ data, className, height = 56 }: SparklineProps) {
  if (data.length < 2) return null;

  const width = 100;
  const max = Math.max(...data.map((d) => d.count), 1);
  const step = width / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * step,
    // Leave 10% headroom so the peak never touches the top edge.
    y: height - (d.count / max) * (height * 0.9) - height * 0.05,
  }));

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = points[points.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full overflow-visible", className)}
      style={{ height }}
      role="img"
      aria-label={`Submissions over the last ${data.length} days`}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#sparkline-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill="var(--color-primary)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
