'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVerificationAnalytics } from '@/features/reporting/hooks/use-verification-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { EmptyState } from '@/shared/ui/empty-state';
import { PieChart } from '@/shared/ui/charts/pie-chart';
import { ChartSkeleton } from '@/shared/ui/charts/chart-skeleton';
import { ChartContainer } from '@/shared/ui/layout/chart-container';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

export function VerificationAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.verification');
  const { data, isLoading, isError } = useVerificationAnalytics(filter, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  const subjectSlices = data ? [{ name: t('doctorCases'), value: data.doctorCases }, { name: t('patientCases'), value: data.patientCases }] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
        <ExportButton section="verification" filter={filter} />
      </div>
      <DashboardGrid columns={4}>
        <LinkableStatCard icon={ShieldCheck} label={t('pending')} value={String(data?.pending ?? 0)} loading={isLoading} href="/admin/verification-queue" />
        <LinkableStatCard icon={ShieldCheck} label={t('approved')} value={String(data?.approved ?? 0)} loading={isLoading} href="/admin/verification-queue" />
        <LinkableStatCard icon={ShieldCheck} label={t('rejected')} value={String(data?.rejected ?? 0)} loading={isLoading} href="/admin/verification-queue" />
        <LinkableStatCard icon={ShieldCheck} label={t('suspended')} value={String(data?.suspended ?? 0)} loading={isLoading} href="/admin/verification-queue" />
      </DashboardGrid>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartContainer title={t('doctorVsPatientTitle')}>
          {isLoading ? <ChartSkeleton /> : subjectSlices.every((slice) => slice.value === 0) ? <EmptyState icon={ShieldCheck} title={t('emptyTitle')} /> : <PieChart data={subjectSlices} innerRadius={55} />}
        </ChartContainer>
        <ChartContainer title={t('averageReviewTimeTitle')}>
          <div className="flex h-full items-center justify-center text-2xl font-semibold text-text-primary">
            {data?.averageReviewTimeHours == null ? t('notAvailable') : `${data.averageReviewTimeHours.toFixed(1)} ${t('hours')}`}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
