'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui/skeleton';

export type MetricStatVariant = 'hero' | 'tile' | 'inline';

export interface MetricDelta {
  /** Pre-formatted, e.g. "+12%". Never fabricated -- omit `delta` when there is no real comparison. */
  label: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether the change is good, bad or just a change; up is not automatically good (cancellations). */
  tone?: 'success' | 'danger' | 'neutral';
}

export interface MetricStatProps {
  label: string;
  /** A short figure, never a sentence (put explanation in `helperText`). */
  value: string;
  /** 20px glyph, no pastel circle behind it. */
  icon?: LucideIcon;
  /** Optional drill-through destination; renders as a real link. */
  href?: string;
  /** Skeleton in place of the value -- distinct from a genuine zero. */
  loading?: boolean;
  /** Real supporting text under the value (a rating's review count, a range) -- never a fabricated trend. */
  helperText?: ReactNode;
  delta?: MetricDelta;
  /** Real readings, oldest to newest. Rendered as a quiet 1.5px line. */
  sparkline?: number[];
  /**
   * `hero` (metric-xl, ONE per page), `tile` (default), or `inline` -- a
   * chrome-less segment for a horizontal strip of 3-4 stats (see MetricStrip).
   */
  variant?: MetricStatVariant;
  className?: string;
}

const COUNT_UP_MS = 600;

/**
 * A figure never wraps mid-token ("EGP 969. / 00"): it stays on one line and
 * shrinks with the width it actually has (`cqi` of its own wrapper) before it
 * would overflow, capped at the scale's own size. Units and qualifiers
 * ("per consultation") belong in `helperText`, not in `value`.
 */
const VALUE_FONT_SIZE = {
  hero: 'clamp(1.5rem, 12cqi, 2.5rem)',
  regular: 'clamp(1.125rem, 12cqi, 1.5rem)',
} as const;

/**
 * Counts an integer string up from 0 the first time it appears (first mount,
 * or the first time real data replaces the loading state) -- never on a
 * refetch, and not at all under `prefers-reduced-motion`.
 */
function useCountUpOnce(value: string, enabled: boolean): { text: string; animating: boolean } {
  const target = /^\d{1,7}$/.test(value) ? Number(value) : null;
  const done = useRef(false);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || target === null || done.current) return;
    done.current = true;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setShown(null);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, target]);

  return { text: shown === null ? value : String(shown), animating: shown !== null };
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${(index / (points.length - 1)) * 80} ${22 - ((point - min) / span) * 20}`)
    .join(' ');
  return (
    <svg viewBox="0 0 80 24" aria-hidden="true" focusable="false" className="h-6 w-20 shrink-0 overflow-visible text-text-tertiary">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeltaChip({ delta }: { delta: MetricDelta }) {
  const tone = delta.tone ?? 'neutral';
  const glyph = delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : ArrowRight;
  return (
    <span
      dir="ltr"
      className={cn(
        'inline-flex h-5.5 items-center gap-0.5 rounded-full px-2 text-caption font-semibold tracking-normal',
        tone === 'success' && 'bg-success-subtle text-success-emphasis',
        tone === 'danger' && 'bg-danger-subtle text-danger-emphasis',
        tone === 'neutral' && 'bg-neutral-subtle text-text-secondary',
      )}
    >
      <Icon icon={glyph} size="xs" />
      {delta.label}
    </span>
  );
}

/**
 * The one KPI/stat primitive -- replaces StatCard, MetricCard and the old
 * LinkableStatCard. Anatomy: label (small, muted), value (display face,
 * tabular), optional delta chip, optional 20px icon, optional sparkline.
 * Lay several out with `MetricGrid` (equal heights) or `MetricStrip`
 * (a single horizontal band of 3-4 `inline` stats). A page with two KPI rows
 * keeps one.
 */
export function MetricStat({
  label,
  value,
  icon,
  href,
  loading = false,
  helperText,
  delta,
  sparkline,
  variant = 'tile',
  className,
}: MetricStatProps) {
  const { text: display, animating } = useCountUpOnce(value, !loading);
  const isHero = variant === 'hero';

  const body = (
    <>
      {icon && <Icon icon={icon} size="md" className="absolute end-4 top-4 text-text-tertiary" />}
      <p className={cn('min-w-0 text-small text-text-tertiary', icon && 'pe-8')}>{label}</p>
      {loading ? (
        <Skeleton className={cn('mt-2', isHero ? 'h-11 w-32' : 'h-8 w-16')} />
      ) : (
        // The wrapper is the size container the figure measures itself against (a stretched block, so its
        // width always comes from the stat, never from the text).
        <div className="@container relative mt-1 min-w-0">
          <p
            data-numeric
            dir="auto"
            className={cn(
              'overflow-hidden font-display text-ellipsis whitespace-nowrap tabular-nums text-text-primary',
              isHero ? 'text-metric-xl' : 'text-metric',
            )}
            style={{ fontSize: isHero ? VALUE_FONT_SIZE.hero : VALUE_FONT_SIZE.regular }}
          >
            {/* While counting up, the running number is hidden from assistive tech and the final value is announced instead. */}
            {animating ? <span aria-hidden="true">{display}</span> : display}
            {animating && <span className="sr-only">{value}</span>}
          </p>
        </div>
      )}
      {!loading && (delta || sparkline || helperText) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {delta && <DeltaChip delta={delta} />}
            {helperText && <span className="min-w-0 text-small text-text-tertiary">{helperText}</span>}
          </div>
          {sparkline && <Sparkline points={sparkline} />}
        </div>
      )}
    </>
  );

  const chrome =
    variant === 'inline'
      ? 'relative flex min-w-40 flex-1 snap-start flex-col px-(--card-pad) py-4'
      : cn(
          'relative flex h-full min-w-0 flex-col rounded-(--r-card) border border-border-default bg-surface p-(--card-pad) shadow-xs',
          isHero && 'sm:p-8',
        );

  const interactive = 'transition-colors duration-(--duration-fast) hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';

  if (href) {
    return (
      <Link href={href} className={cn(chrome, interactive, className)}>
        {body}
      </Link>
    );
  }
  return <div className={cn(chrome, className)}>{body}</div>;
}

export interface MetricGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Column count once the grid is at least 960px wide; two columns from 640px, one below. */
  columns?: 2 | 3 | 4;
}

/**
 * Equal-height grid for `tile` stats (`grid-auto-rows: 1fr`, `minmax(0, 1fr)` columns so long values
 * never overflow). Columns follow the width the grid actually has (its own size container), not the
 * viewport: 1 below 640px, 2 from 640px, `columns` from 960px.
 */
export function MetricGrid({ columns = 4, className, ...props }: MetricGridProps) {
  const cols = { 2: '', 3: '@wide:grid-cols-3', 4: '@wide:grid-cols-4' }[columns];
  return (
    <div className="@container">
      <div className={cn('grid auto-rows-fr grid-cols-1 gap-(--card-gap) @pane:grid-cols-2', cols, className)} {...props} />
    </div>
  );
}

/**
 * One band of 2-4 `inline` stats, laid out by the width it actually has: below 640px a sideways
 * snap-scroll strip, from 640px a two-column grid, from 960px one row. A lone last item in the
 * two-column grid spans the row instead of leaving a hole.
 */
export function MetricStrip({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="@container">
      <div
        // Focusable so a keyboard user can scroll the strip sideways on a phone.
        tabIndex={0}
        className={cn(
          'scrollbar-hidden flex snap-x snap-mandatory overflow-x-auto rounded-(--r-card) border border-border-default bg-surface shadow-xs',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          // Strip: hairlines between items.
          '@max-pane:*:not-first:border-s @max-pane:*:not-first:border-border-default',
          // Grid: 1px gaps over a border-coloured backing draw the dividers; each cell keeps the surface fill.
          '@pane:grid @pane:grid-cols-2 @pane:gap-px @pane:overflow-hidden @pane:bg-border-default @pane:*:bg-surface',
          '@pane:[&>*:last-child:nth-child(odd)]:col-span-2',
          '@wide:grid-cols-[repeat(auto-fit,minmax(0,1fr))] @wide:[&>*:last-child:nth-child(odd)]:col-span-1',
          className,
        )}
        {...props}
      />
    </div>
  );
}
