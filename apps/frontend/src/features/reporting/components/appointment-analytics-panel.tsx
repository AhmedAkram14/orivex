'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppointmentAnalytics } from '@/features/reporting/hooks/use-appointment-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { ChartContainer } from '@/shared/ui/layout/chart-container';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { AreaChart } from '@/shared/ui/charts/area-chart';
import { BarChart } from '@/shared/ui/charts/bar-chart';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';

export function AppointmentAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.appointments');
  const { data, isLoading, isError } = useAppointmentAnalytics({ ...filter, bucket: 'day' }, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const percent = (value: number | undefined): string => (value === undefined ? '—' : `${(value * 100).toFixed(1)}%`);
  const trend = data?.byBucket.map((point) => ({ date: new Date(point.bucket).toLocaleDateString(), count: point.count })) ?? [];
  const peakHours = data?.peakHours.map((row) => ({ hour: `${row.hour}:00`, count: row.count })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <ExportButton section="appointments" filter={filter} />
      </div>
      <DashboardGrid columns={3}>
        <LinkableStatCard icon={CalendarDays} label={t('completionRate')} value={percent(data?.completionRate)} loading={isLoading} />
        <LinkableStatCard icon={CalendarDays} label={t('cancellationRate')} value={percent(data?.cancellationRate)} loading={isLoading} />
        <LinkableStatCard icon={CalendarDays} label={t('noShowRate')} value={percent(data?.noShowRate)} loading={isLoading} />
      </DashboardGrid>
      <ChartContainer title={t('trendTitle')}>
        {isLoading ? (
          <ChartSkeleton />
        ) : trend.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <AreaChart data={trend} xKey="date" series={[{ key: 'count', label: t('trendSeriesLabel') }]} />
        )}
      </ChartContainer>
      <ChartContainer title={t('peakHoursTitle')}>
        {isLoading ? (
          <ChartSkeleton />
        ) : peakHours.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <BarChart data={peakHours} xKey="hour" series={[{ key: 'count', label: t('peakHoursSeriesLabel') }]} />
        )}
      </ChartContainer>
    </div>
  );
}
