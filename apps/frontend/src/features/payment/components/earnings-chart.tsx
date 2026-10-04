'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Bucket, Granularity } from '@/features/payment/lib/earnings';
import { useElementWidth } from '@/shared/hooks/use-element-width';
import { useDirection } from '@/shared/i18n/use-direction';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { cn } from '@/shared/lib/cn';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';
import { Skeleton } from '@/shared/ui/skeleton';

/** A round top for the axis: three even steps of a "nice" number (1, 2, 2.5, 5 x 10^n). */
function niceStep(max: number): number {
  if (max <= 0) return 1;
  const raw = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((multiple) => multiple * magnitude >= raw)! * magnitude;
  return step;
}

export interface EarningsChartProps {
  buckets: Bucket[];
  granularity: Granularity;
  currency: string;
  /** The range in words, for the subtitle ("Sep 3 – Oct 3, 2026"). */
  rangeLabel: string;
  loading: boolean;
}

/**
 * "Earnings over time": the selected range as bars of net earnings -- daily, weekly or monthly with the range. Bars
 * are a 60% ink tint; the range's most recent period is solid ink with a lime cap; a period with nothing earned
 * shows a 2px baseline tick, so "nothing earned" reads differently from "no bar". The highest bar carries its value;
 * three gridlines with compact labels. One tab stop: arrows move between bars (in reading direction), each showing
 * its date, gross, commission, net and consultations.
 */
export function EarningsChart({
  buckets,
  granularity,
  currency,
  rangeLabel,
  loading,
}: EarningsChartProps) {
  const t = useTranslations('doctor.earnings.chart');
  const tTable = useTranslations('doctor.earnings.table');
  const format = useFormatter();
  const direction = useDirection();
  const tooltipId = useId();
  const barRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, buckets.length - 1));
  const { ref: plotRef, width: plotWidth } = useElementWidth<HTMLDivElement>();

  const money = (amount: number) => formatCurrency(format, amount, currency);
  const compact = (amount: number) =>
    format.number(amount, { notation: 'compact', maximumFractionDigits: 1 });
  const step = niceStep(Math.max(0, ...buckets.map((bucket) => bucket.net)));
  const top = step * 3;
  const highest = buckets.reduce(
    (best, bucket, index) => (bucket.net > (buckets[best]?.net ?? 0) ? index : best),
    -1,
  );
  const hasEarnings = buckets.some((bucket) => bucket.net > 0);

  const label = (bucket: Bucket) => {
    const start = new Date(bucket.start);
    if (granularity === 'day')
      return format.dateTime(start, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    if (granularity === 'month')
      return format.dateTime(start, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return format.dateTimeRange(start, new Date(bucket.end - 1), {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };
  const tick = (bucket: Bucket) => {
    const start = new Date(bucket.start);
    if (granularity === 'month') return format.dateTime(start, { month: 'short', timeZone: 'UTC' });
    return format.dateTime(start, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  // Axis labels never crowd: one per ~90px of chart (at most six), always including the latest.
  const labelSlots = plotWidth > 0 ? Math.max(2, Math.min(6, Math.floor(plotWidth / 90))) : 6;
  const every = Math.max(1, Math.ceil(buckets.length / labelSlots));
  const showTick = (index: number) => (buckets.length - 1 - index) % every === 0;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next = index;
    if (event.key === forward) next = Math.min(buckets.length - 1, index + 1);
    else if (event.key === back) next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buckets.length - 1;
    else if (event.key === 'Escape') {
      setActive(null);
      return;
    } else return;
    event.preventDefault();
    setFocusIndex(next);
    setActive(next);
    barRefs.current[next]?.focus();
  }

  const shown = active !== null ? buckets[active] : undefined;
  // The one tab stop stays on a real bar when the range (and so the bars) change.
  const tabStop = Math.min(focusIndex, buckets.length - 1);
  // The tooltip sits over its bar, anchored to the near edge at either end so it never leaves the card.
  const position = active !== null ? (active + 0.5) / buckets.length : 0.5;
  const tooltipShift =
    position < 0.2
      ? 'translate-x-0 rtl:translate-x-0'
      : position > 0.8
        ? '-translate-x-full rtl:translate-x-full'
        : '-translate-x-1/2 rtl:translate-x-1/2';

  return (
    <WidgetContainer
      data-earnings-chart={granularity}
      title={<span className="text-h3">{t('title')}</span>}
      titleAs="h2"
      description={rangeLabel}
    >
      <div ref={plotRef}>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div className="relative pt-6">
            {/* Nothing earned: the periods still draw (as baseline ticks), with one quiet line -- the illustration is the
              transactions card's. */}
            {!hasEarnings && (
              <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-small text-text-tertiary">
                {t('emptyTitle')}
              </p>
            )}
            {/* Gridlines: three steps, compact labels at the start edge. */}
            <div className="pointer-events-none absolute inset-x-0 top-6 h-48" aria-hidden="true">
              {[3, 2, 1].map((multiple) => (
                <div
                  key={multiple}
                  className="absolute inset-x-0 border-t border-dashed border-border-default"
                  style={{ top: `${100 - (multiple / 3) * 100}%` }}
                >
                  {hasEarnings && (
                    <span className="absolute -top-2 start-0 bg-surface pe-1 text-caption text-text-tertiary tabular-nums">
                      {compact(step * multiple)}
                    </span>
                  )}
                </div>
              ))}
              <div className="absolute inset-x-0 bottom-0 border-t border-border-default" />
            </div>

            <div
              role="group"
              aria-label={t('barsLabel', { granularity })}
              className="relative ms-10 flex h-48 items-end gap-0.5"
            >
              {buckets.map((bucket, index) => {
                const height = (bucket.net / top) * 100;
                const empty = bucket.net <= 0;
                return (
                  <div
                    key={bucket.key}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    {index === highest && !empty && (
                      <span
                        className="absolute z-10 -translate-y-full pb-1 text-caption font-semibold whitespace-nowrap text-text-primary tabular-nums"
                        style={{ bottom: `${height}%` }}
                      >
                        <bdi>{compact(bucket.net)}</bdi>
                      </span>
                    )}
                    <button
                      ref={(node) => {
                        barRefs.current[index] = node;
                      }}
                      type="button"
                      data-bucket={bucket.key}
                      data-latest={bucket.latest || undefined}
                      tabIndex={index === tabStop ? 0 : -1}
                      aria-label={`${label(bucket)}: ${tTable('net')} ${money(bucket.net)}`}
                      aria-describedby={active === index ? tooltipId : undefined}
                      onMouseEnter={() => setActive(index)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => {
                        setFocusIndex(index);
                        setActive(index);
                      }}
                      onBlur={() => setActive(null)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                      className={cn(
                        'h-full w-full max-w-10 rounded-t-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                        'flex items-end',
                      )}
                    >
                      {empty ? (
                        <span className="block h-0.5 w-full rounded-full bg-text-primary/35" />
                      ) : (
                        <span
                          className={cn(
                            'block w-full rounded-t-sm',
                            bucket.latest
                              ? 'border-t-[3px] border-pulse bg-text-primary'
                              : 'bg-text-primary/60',
                            active === index && !bucket.latest && 'bg-text-primary/80',
                          )}
                          style={{ height: `${Math.max(height, 1.5)}%` }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}

              {shown && active !== null && (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className={cn(
                    'pointer-events-none absolute bottom-full z-20 mb-2 w-max min-w-44 rounded-md border border-border-default bg-surface p-3 text-small shadow-lg',
                    tooltipShift,
                  )}
                  style={{
                    insetInlineStart: `${position < 0.2 ? 0 : position > 0.8 ? 100 : position * 100}%`,
                  }}
                >
                  <p className="mb-1.5 font-semibold text-text-primary">{label(shown)}</p>
                  <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
                    <dt className="text-text-tertiary">{tTable('gross')}</dt>
                    <dd className="text-end tabular-nums text-text-secondary">
                      <bdi>{money(shown.gross)}</bdi>
                    </dd>
                    <dt className="text-text-tertiary">{tTable('commission')}</dt>
                    <dd className="text-end tabular-nums text-text-secondary">
                      <bdi>{money(shown.commission)}</bdi>
                    </dd>
                    <dt className="font-medium text-text-primary">{tTable('net')}</dt>
                    <dd className="text-end font-semibold tabular-nums text-text-primary">
                      <bdi>{money(shown.net)}</bdi>
                    </dd>
                  </dl>
                  <p className="mt-1.5 text-text-tertiary">
                    {t('consultations', { count: shown.count })}
                  </p>
                </div>
              )}
            </div>

            <div className="ms-10 mt-1.5 flex gap-0.5" aria-hidden="true">
              {buckets.map((bucket, index) => (
                <span key={bucket.key} className="relative h-4 min-w-0 flex-1">
                  {showTick(index) && (
                    <span className="absolute start-1/2 -translate-x-1/2 text-caption whitespace-nowrap text-text-tertiary rtl:translate-x-1/2">
                      {tick(bucket)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}
