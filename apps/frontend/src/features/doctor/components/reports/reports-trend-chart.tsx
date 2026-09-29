'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { DoctorReportsAnalyticsBucketPoint } from '@/features/doctor/api/types';
import { BarChart } from '@/shared/ui/charts/bar-chart';
import { EmptyState } from '@/shared/ui/empty-state';

export interface ReportsTrendChartProps {
  data: DoctorReportsAnalyticsBucketPoint[];
}

/**
 * Doctor Reports page rebuild (Phase 3): the appointment-volume trend below
 * the tile grid -- structurally copies `appointment-analytics-panel.tsx`'s
 * own trend-chart block (empty-state pattern, `AreaChart` usage), fed by
 * `byBucket` instead of the admin panel's platform-wide series.
 * `next/dynamic`-loaded with `ssr: false` from `reports-summary.tsx`
 * (Recharts needs a real DOM), same mechanism `admin/analytics/page.tsx`
 * uses for every one of its own chart-bearing panels.
 */
const DAY_MS = 86_400_000;

type Granularity = 'day' | 'week' | 'month';

/**
 * Real daily counts (the API's own day buckets) grouped into bars the range can carry: one bar per
 * day up to a month, per week up to ~6 months, per month beyond. Missing days count as real zeros so a
 * quiet day is a visible gap, not a skipped column. Only sums what the API returned.
 */
function toBars(points: DoctorReportsAnalyticsBucketPoint[]): {
  granularity: Granularity;
  bars: { start: number; count: number }[];
} {
  const byDay = new Map<number, number>();
  for (const point of points) {
    const day = Date.parse(`${point.bucket.slice(0, 10)}T00:00:00Z`);
    byDay.set(day, (byDay.get(day) ?? 0) + point.count);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const first = days[0];
  const last = days[days.length - 1];
  const spanDays = Math.round((last - first) / DAY_MS) + 1;
  const granularity: Granularity = spanDays <= 31 ? 'day' : spanDays <= 183 ? 'week' : 'month';

  const startOf = (ms: number) => {
    const date = new Date(ms);
    if (granularity === 'day') return ms;
    if (granularity === 'week') return ms - ((date.getUTCDay() + 1) % 7) * DAY_MS; // weeks start on Saturday (Egypt)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  };
  const next = (ms: number) => {
    const date = new Date(ms);
    if (granularity === 'day') return ms + DAY_MS;
    if (granularity === 'week') return ms + 7 * DAY_MS;
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  };

  const bars: { start: number; count: number }[] = [];
  for (let cursor = startOf(first); cursor <= last; cursor = next(cursor))
    bars.push({ start: cursor, count: 0 });
  for (const [day, count] of byDay) {
    const bar = bars.find((item) => item.start === startOf(day));
    if (bar) bar.count += count;
  }
  return { granularity, bars };
}

export function ReportsTrendChart({ data }: ReportsTrendChartProps) {
  const t = useTranslations('doctor.reports.trend');
  const format = useFormatter();

  if (data.length === 0) {
    return (
      <EmptyState
        illustration="records-start"
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    );
  }

  const { granularity, bars } = toBars(data);
  const barLabel = (start: number) =>
    granularity === 'month'
      ? format.dateTime(new Date(start), { month: 'short', year: '2-digit', timeZone: 'UTC' })
      : format.dateTime(new Date(start), { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const chartData = bars.map((bar) => ({ label: barLabel(bar.start), count: bar.count }));

  return (
    // `w-full`: ChartContainer centres its child in a flex row, so without an explicit width this wrapper shrinks to 0 and ResponsiveContainer measures 0px -- the chart rendered as a blank card.
    <div className="relative w-full min-w-0">
      {/* Discrete bars -- one per day, week or month depending on the range -- never a smoothed area; hover shows each bucket's count. */}
      <BarChart
        data={chartData}
        xKey="label"
        series={[{ key: 'count', label: t('seriesLabel') }]}
        formatValue={(value) => format.number(value)}
      />
      {/*
       * Phase 8: a visually-hidden accessible alternative to the chart --
       * screen-reader users get the exact same per-day counts as a real
       * `<table>` instead of only Recharts' SVG (which exposes little to
       * nothing to assistive tech), same convention as the "no full
       * redesign needed, just don't leave a screen-reader user with
       * literally nothing" bar this codebase already holds itself to
       * elsewhere (see `EmptyState`'s always-real copy, never a bare icon).
       */}
      {/* The `sr-only` clip must sit on a block wrapper: a <table> ignores the 1px width/clip and stretches the page horizontally (seen at 390px). */}
      <div className="sr-only">
        <table>
          <caption>{t('seriesLabel')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('tableDateHeader')}</th>
              <th scope="col">{t('seriesLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.bucket}>
                <td>
                  {format.dateTime(new Date(point.bucket), {
                    dateStyle: 'medium',
                    timeZone: 'Africa/Cairo',
                  })}
                </td>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
