import { cn } from '@/shared/lib/cn';

export interface CircularProgressProps {
  /** The real numerator (e.g. consultations completed today). */
  value: number;
  /** The real denominator (e.g. consultations scheduled today). */
  max: number;
  /** Centered label under the percentage — e.g. "3 of 5 done". */
  label?: string;
  className?: string;
  /** Ring diameter in px — additive, defaults to the original 120 so any other caller's layout is unaffected. */
  size?: number;
  /** Ring stroke width in px — additive, defaults to the original 10. */
  strokeWidth?: number;
}

const DEFAULT_SIZE = 120;
const DEFAULT_STROKE_WIDTH = 10;

/**
 * A small circular-progress ring — plain inline SVG, no chart library
 * (CLAUDE.md forbids introducing one for a single ratio widget). Honest
 * 0/0 handling: `max <= 0` renders an empty ring at 0%, never `NaN` from a
 * divide-by-zero.
 */
export function CircularProgress({
  value,
  max,
  label,
  className,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const percent = Math.round(ratio * 100);
  const dashOffset = circumference * (1 - ratio);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${percent}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-secondary-subtle"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="stroke-primary transition-[stroke-dashoffset] duration-(--duration-slow)"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-text-primary text-xl font-semibold"
        >
          {percent}%
        </text>
      </svg>
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}
