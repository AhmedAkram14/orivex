'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { usePatientAnalytics } from '@/features/reporting/hooks/use-patient-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { PieChart } from '@/shared/ui/charts/pie-chart';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';
import { ChartContainer } from '@/shared/ui/layout/chart-container';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

export function PatientAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.patients');
  const { data, isLoading, isError } = usePatientAnalytics(filter, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const genderSlices = Object.entries(data?.genderDistribution ?? {}).map(([name, value]) => ({ name, value }));
  const ageSlices = (data?.ageDistribution ?? []).map((bucket) => ({ name: bucket.bucket, value: bucket.count }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Heading as="h2" level={4}>{t('title')}</Heading>
        <ExportButton section="patients" filter={filter} />
      </div>
      <DashboardGrid columns={4}>
        <LinkableStatCard icon={Users} label={t('newPatients')} value={String(data?.newPatients ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Users} label={t('returningPatients')} value={String(data?.returningPatients ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Users} label={t('verifiedPatients')} value={String(data?.verifiedPatients ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Users} label={t('activePatients')} value={String(data?.activePatients ?? 0)} loading={isLoading} />
      </DashboardGrid>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartContainer title={t('genderTitle')}>
          {isLoading ? <ChartSkeleton /> : genderSlices.length === 0 ? <EmptyState icon={Users} title={t('emptyTitle')} /> : <PieChart data={genderSlices} />}
        </ChartContainer>
        <ChartContainer title={t('ageTitle')}>
          {isLoading ? <ChartSkeleton /> : ageSlices.length === 0 ? <EmptyState icon={Users} title={t('emptyTitle')} /> : <PieChart data={ageSlices} innerRadius={55} />}
        </ChartContainer>
      </div>
      <WidgetContainer title={t('mostActiveTitle')} loading={isLoading}>
        {data && data.mostActivePatients.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {data.mostActivePatients.map((patient) => (
              <li key={patient.patientId} className="flex items-center justify-between border-b border-border-default py-1 last:border-0">
                <span>{patient.displayName}</span>
                <span className="tabular-nums text-text-tertiary">{patient.appointmentCount}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Users} title={t('emptyTitle')} description={t('emptyDescription')} />
        )}
      </WidgetContainer>
    </div>
  );
}
