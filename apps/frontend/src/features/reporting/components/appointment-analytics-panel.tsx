'use client';

import { CalendarDays } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useAppointmentAnalytics } from '@/features/reporting/hooks/use-appointment-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { ChartContainer } from '@/shared/ui/layout/chart-container';
import { MetricGrid, MetricStat } from '@/shared/ui/metric-stat';
import { AreaChart } from '@/shared/ui/charts/area-chart';
import { BarChart } from '@/shared/ui/charts/bar-chart';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';

export function AppointmentAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.appointments');
  const format = useFormatter();
  const { data, isLoading, isError } = useAppointmentAnalytics({ ...filter, bucket: 'day' }, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const percent = (value: number | undefined): string =>
    value === undefined ? '—' : format.number(value, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // "Over time" ends today: buckets are by scheduledAt, so booked future visits would otherwise stretch the axis
  // weeks ahead (they are counted in "Upcoming appointments"). An explicit "To" date is respected as chosen.
  const trendEnd = filter.dateTo ? Number.POSITIVE_INFINITY : Date.now();
  const trend =
    data?.byBucket
      .filter((point) => new Date(point.bucket).getTime() <= trendEnd)
      .map((point) => ({
        date: format.dateTime(new Date(point.bucket), { month: 'short', day: 'numeric', timeZone: 'Africa/Cairo' }),
        count: point.count,
      })) ?? [];
  const peakHours = data?.peakHours.map((row) => ({ hour: `${row.hour}:00`, count: row.count })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Heading as="h2" level={4}>{t('title')}</Heading>
        <ExportButton section="appointments" filter={filter} />
      </div>
      <MetricGrid columns={3} minColumns={2}>
        <MetricStat icon={CalendarDays} label={t('completionRate')} value={percent(data?.completionRate)} loading={isLoading} />
        <MetricStat icon={CalendarDays} label={t('cancellationRate')} value={percent(data?.cancellationRate)} loading={isLoading} />
        <MetricStat icon={CalendarDays} label={t('noShowRate')} value={percent(data?.noShowRate)} loading={isLoading} />
      </MetricGrid>
      <ChartContainer title={t('trendTitle')}>
        {isLoading ? (
          <ChartSkeleton />
        ) : trend.length === 0 ? (
          <EmptyState illustration="calendar-clear" title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <AreaChart data={trend} xKey="date" series={[{ key: 'count', label: t('trendSeriesLabel') }]} />
        )}
      </ChartContainer>
      <ChartContainer title={t('peakHoursTitle')}>
        {isLoading ? (
          <ChartSkeleton />
        ) : peakHours.length === 0 ? (
          <EmptyState illustration="calendar-clear" title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <BarChart data={peakHours} xKey="hour" series={[{ key: 'count', label: t('peakHoursSeriesLabel') }]} />
        )}
      </ChartContainer>
    </div>
  );
}
