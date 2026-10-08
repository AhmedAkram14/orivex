import { cn } from '@/shared/lib/cn';

/**
 * The logo's ECG trace, drawn as one 1.5px `currentColor` stroke. A signature
 * motif, used sparingly: at most ONE per screen (a divider, a progress line or
 * a live indicator -- never decoration on every card). Decorative: always
 * `aria-hidden`, so meaning must never live only here.
 *
 *  - `divider`  a hairline that carries the pulse in its centre
 *  - `progress` a track filled to `progress` (0..1), with the pulse at its head
 *  - `live`     a small looping trace for "happening now" (e.g. next to a live badge)
 *
 * `animated` draws the trace in (dash-draw); it is static under
 * `prefers-reduced-motion` (scales.css collapses animation to a single frame).
 */
export type PulseLineVariant = 'divider' | 'progress' | 'live';

// One heartbeat in a 64x24 box: flat, small bump, the tall spike, a dip, flat.
const PULSE_PATH = 'M0 12 H18 L22 7 L26 14 L30 2 L35 21 L39 12 H46 L49 9 L52 12 H64';

interface PulseGlyphProps {
  animated?: boolean;
  loop?: boolean;
  className?: string;
}

function PulseGlyph({ animated, loop, className }: PulseGlyphProps) {
  return (
    <svg
      viewBox="0 0 64 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('h-6 w-16 shrink-0 overflow-visible', className)}
    >
      <path
        d={PULSE_PATH}
        pathLength={1}
        strokeDasharray={animated || loop ? 1 : undefined}
        className={cn(animated && !loop && 'animate-pulse-draw', loop && 'animate-pulse-loop')}
        style={animated || loop ? { strokeDashoffset: 1 } : undefined}
      />
    </svg>
  );
}

export interface PulseLineProps {
  variant?: PulseLineVariant;
  /** Draw the trace in once on mount (`divider`/`progress`), or loop it (`live`). */
  animated?: boolean;
  /** 0..1, `progress` variant only. */
  progress?: number;
  className?: string;
}

export function PulseLine({ variant = 'divider', animated = false, progress = 0, className }: PulseLineProps) {
  if (variant === 'live') {
    return <PulseGlyph loop={animated} className={cn('h-4 w-10', className)} />;
  }

  if (variant === 'progress') {
    const clamped = Math.min(1, Math.max(0, progress));
    return (
      <div aria-hidden="true" className={cn('relative flex h-6 w-full items-center text-text-primary', className)}>
        <span className="absolute inset-x-0 h-px bg-border-default" />
        <span
          className="absolute inset-y-0 start-0 flex items-center transition-[width] duration-(--duration-slow) ease-standard"
          // The glyph rides just past the fill's head; leave its 2rem at the end so a full track never overflows.
          style={{ width: `calc((100% - 2rem) * ${clamped})` }}
        >
          <span className="h-0.5 flex-1 bg-current" />
          <PulseGlyph animated={animated} className="-me-8 h-5 w-8" />
        </span>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn('flex w-full items-center text-text-primary', className)}>
      <span className="h-px flex-1 bg-border-default" />
      <PulseGlyph animated={animated} className="mx-3" />
      <span className="h-px flex-1 bg-border-default" />
    </div>
  );
}
