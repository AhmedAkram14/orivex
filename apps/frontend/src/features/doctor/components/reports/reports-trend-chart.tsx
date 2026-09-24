'use client';

import { TrendingUp } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { DoctorReportsAnalyticsBucketPoint } from '@/features/doctor/api/types';
import { AreaChart } from '@/shared/ui/charts/area-chart';
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
export function ReportsTrendChart({ data }: ReportsTrendChartProps) {
  const t = useTranslations('doctor.reports.trend');
  const format = useFormatter();

  if (data.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title={t('emptyTitle')} description={t('emptyDescription')} />
    );
  }

  const trend = data.map((point) => ({
    date: new Date(point.bucket).getTime(),
    count: point.count,
  }));

  return (
    <div>
      {/*
       * Phase 8: `type="linear"` (not the shared `AreaChart` default
       * `"monotone"`) -- each point here is one discrete day's real
       * appointment count. A smoothed spline curve visually implies
       * fractional/continuous values existed between two days, which
       * doesn't exist in this data -- straight segments between real points
       * is the honest reading.
       */}
      <AreaChart
        data={trend}
        xKey="date"
        series={[{ key: 'count', label: t('seriesLabel') }]}
        type="linear"
        timeAxis={{
          format: (timestamp) =>
            format.dateTime(new Date(timestamp), { dateStyle: 'medium', timeZone: 'Africa/Cairo' }),
        }}
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
