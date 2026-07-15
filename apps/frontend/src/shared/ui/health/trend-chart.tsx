import { cn } from '@/shared/lib/cn';

const VIEWBOX_WIDTH = 240;
const VIEWBOX_HEIGHT = 64;
const PADDING = 6;

export interface TrendChartProps {
  /** Raw numeric readings, oldest to newest — this component never formats or fabricates values, it only plots what it's given. */
  values: number[];
  /** Accessible description of the trend (e.g. "Weight over the last 6 readings, 74 to 71 kg") — the SVG itself is marked decorative since a screen reader can't usefully trace a polyline. */
  label: string;
  className?: string;
}

/**
 * A dependency-free SVG sparkline — this codebase's "charts architecture"
 * primitive (milestone 6). No charting library is introduced (none exists
 * elsewhere in the project, and CLAUDE.md requires discussion before adding
 * one); a hand-rolled polyline is the same approach already used for
 * `WeeklyCalendar`'s custom grid, not a shortcut specific to this component.
 */
export function TrendChart({ values, label, className }: TrendChartProps) {
  if (values.length < 2) {
    return (
      <div className={cn('flex h-16 items-center justify-center text-xs text-text-tertiary', className)}>
        {label}
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (VIEWBOX_WIDTH - PADDING * 2) / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = PADDING + index * stepX;
      const y = PADDING + (1 - (value - min) / range) * (VIEWBOX_HEIGHT - PADDING * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className={cn('h-16 w-full', className)}
      role="img"
      aria-label={label}
    >
      <polyline
        points={points}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
