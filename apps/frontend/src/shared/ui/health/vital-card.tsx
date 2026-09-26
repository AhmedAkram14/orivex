'use client';

import type { LucideIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import type { VitalReferenceBand } from '@/shared/lib/health/vital-reference-ranges';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

export type VitalStatus = 'in_range' | 'above' | 'below';

export interface VitalReadingPoint {
  value: number;
  /** ISO timestamp. */
  recordedAt: string;
  /** Pre-formatted reading, e.g. "128/82 mmHg" -- shown in the point's tooltip. */
  valueLabel: string;
  /** Who recorded it, when the API says so. Omitted from the tooltip otherwise. */
  recordedBy?: string;
}

export interface VitalCardProps {
  title: string;
  icon?: LucideIcon;
  /** Latest reading; undefined when nothing has been recorded (renders the empty state). */
  latest?: { valueLabel: string; recordedAt: string };
  /** Readings in the selected window, oldest to newest. */
  readings: VitalReadingPoint[];
  /** Normal range, drawn as a shaded band behind the line. */
  band?: VitalReferenceBand;
  /** Clinical evaluation of the latest reading. `null`/undefined = not evaluated (no chip). */
  status?: VitalStatus | null;
  /** `compact` is the patient-chart size (smaller value, shorter chart). */
  size?: 'md' | 'compact';
  emptyTitle: string;
  emptyDescription: string;
  loading?: boolean;
  /** Accessible description of the trend for screen readers. */
  trendLabel: string;
  /** Extra line under the date, e.g. a "recorded 3 months ago" staleness badge. */
  note?: ReactNode;
  className?: string;
}

const W = 240;
const PAD_X = 8;

/**
 * A vital sign: latest value + unit + date, the last N readings as a neutral
 * line with points, and a shaded reference band (the normal range). Only the
 * status chip is coloured -- the series itself stays neutral so a colour always
 * means a clinical evaluation, never decoration. Every point has a tooltip
 * (date, value, who recorded it). The line draws in over 500ms, then the band
 * fades in; both are static under `prefers-reduced-motion`.
 *
 * Non-diagnostic by design: the chip reads "In range" / "Above target" /
 * "Below target" -- a measurement against a stated range, never a diagnosis.
 */
export function VitalCard({
  title,
  icon,
  latest,
  readings,
  band,
  status,
  size = 'md',
  emptyTitle,
  emptyDescription,
  loading = false,
  trendLabel,
  note,
  className,
}: VitalCardProps) {
  const t = useTranslations('ds.vital');
  const format = useFormatter();
  const compact = size === 'compact';
  const H = compact ? 56 : 88;
  const PAD_Y = 8;

  const shell = (children: ReactNode) => (
    <TooltipProvider delayDuration={100}>
    <section
      aria-label={title}
      className={cn(
        'flex h-full min-w-0 flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface shadow-xs',
        compact ? 'p-4' : 'p-(--card-pad)',
        className,
      )}
    >
      {children}
    </section>
    </TooltipProvider>
  );

  if (loading) {
    return shell(
      <>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className={compact ? 'h-14 w-full' : 'h-22 w-full'} />
      </>,
    );
  }

  if (!latest) {
    return shell(
      <>
        <p className="flex items-center gap-2 text-small text-text-tertiary">
          {icon && <Icon icon={icon} size="md" />}
          {title}
        </p>
        {compact ? (
          <p className="text-small font-medium text-text-primary">{emptyTitle}</p>
        ) : (
          <EmptyState illustration="records-start" size="sm" title={emptyTitle} description={emptyDescription} />
        )}
      </>,
    );
  }

  const values = readings.map((reading) => reading.value);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 1;
  // The y-domain always contains the band, so the reference range is visible even when every reading sits inside it.
  const lo = Math.min(dataMin, band?.low ?? dataMin);
  const hi = Math.max(dataMax, band?.high ?? dataMax);
  const span = hi - lo || 1;
  const y = (value: number) => PAD_Y + (1 - (value - lo) / span) * (H - PAD_Y * 2);
  const x = (index: number) => (readings.length === 1 ? W / 2 : PAD_X + (index * (W - PAD_X * 2)) / (readings.length - 1));
  const points = readings.map((reading, index) => ({ ...reading, cx: x(index), cy: y(reading.value) }));
  const polyline = points.map((point) => `${point.cx},${point.cy}`).join(' ');

  const statusChip =
    status === 'in_range'
      ? { text: t('inRange'), cls: 'bg-success-subtle text-success-emphasis' }
      : status === 'above'
        ? { text: t('aboveTarget'), cls: 'bg-warning-subtle text-warning-emphasis' }
        : status === 'below'
          ? { text: t('belowTarget'), cls: 'bg-warning-subtle text-warning-emphasis' }
          : null;

  return shell(
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-small text-text-tertiary">
          {icon && <Icon icon={icon} size="md" className="shrink-0" />}
          <span className="truncate">{title}</span>
        </p>
        {statusChip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className={cn(
                  'inline-flex h-5.5 shrink-0 cursor-default items-center rounded-full px-2.5 text-caption font-semibold tracking-normal transition-colors duration-(--duration-base)',
                  statusChip.cls,
                )}
              >
                {statusChip.text}
              </span>
            </TooltipTrigger>
            {band && <TooltipContent>{t('rangeNote', { range: band.label })}</TooltipContent>}
          </Tooltip>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p dir="ltr" data-numeric className={cn('font-display text-text-primary tabular-nums', compact ? 'text-h2' : 'text-metric')}>
          {latest.valueLabel}
        </p>
        <p className="text-caption text-text-tertiary">{format.dateTime(new Date(latest.recordedAt), { dateStyle: 'medium' })}</p>
        {note}
      </div>

      {points.length >= 2 ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={trendLabel}
          // Time runs oldest -> newest in the reading direction, so the plot mirrors under RTL (an SVG's own coordinates don't inherit `dir`).
          className="h-auto w-full overflow-visible rtl:-scale-x-100"
        >
          {band && (
            <rect
              x={0}
              y={y(band.high)}
              width={W}
              height={Math.max(1, y(band.low) - y(band.high))}
              rx={4}
              className="animate-fade-in fill-text-primary/7"
              style={{ animationDelay: '500ms' }}
            />
          )}
          <polyline
            points={polyline}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={1}
            className="animate-draw-in text-text-secondary"
            style={{ strokeDashoffset: 1 }}
          />
          {points.map((point, index) => (
            <Tooltip key={`${point.recordedAt}-${index}`}>
              <TooltipTrigger asChild>
                <g tabIndex={0} className="cursor-default outline-none focus-visible:[&>circle:last-child]:stroke-focus-ring">
                  <circle cx={point.cx} cy={point.cy} r={10} fill="transparent" />
                  <circle cx={point.cx} cy={point.cy} r={index === points.length - 1 ? 3.5 : 2.5} className="fill-surface stroke-text-secondary" strokeWidth={1.5} />
                </g>
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex flex-col gap-0.5" dir="auto">
                  <span className="font-semibold">{point.valueLabel}</span>
                  <span>{format.dateTime(new Date(point.recordedAt), { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {point.recordedBy && <span>{t('recordedBy', { name: point.recordedBy })}</span>}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>
      ) : (
        <p className="text-small text-text-tertiary">{trendLabel}</p>
      )}
    </>,
  );
}
