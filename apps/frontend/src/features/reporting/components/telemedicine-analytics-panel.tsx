'use client';

import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useTelemedicineAnalytics } from '@/features/reporting/hooks/use-telemedicine-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * Average join delay, connection success rate, and missed calls are not
 * shown -- `SessionConnectionLog.note` is free-text, not structured event
 * data, so the backend has no real number for any of those three (see the
 * backend port's own comment). Not hidden silently: the panel's own
 * description names the gap instead of a fabricated metric.
 */
export function TelemedicineAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.telemedicine');
  const { data, isLoading, isError } = useTelemedicineAnalytics(filter, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h2" level={4}>{t('title')}</Heading>
          <p className="text-xs text-text-tertiary">{t('limitationsNote')}</p>
        </div>
        <ExportButton section="telemedicine" filter={filter} />
      </div>
      <DashboardGrid columns={3}>
        <LinkableStatCard icon={Video} label={t('totalSessions')} value={String(data?.totalSessions ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Video} label={t('completedSessions')} value={String(data?.completedSessions ?? 0)} loading={isLoading} />
        <LinkableStatCard
          icon={Video}
          label={t('averageDuration')}
          value={data?.averageDurationMinutes == null ? t('notAvailable') : `${data.averageDurationMinutes.toFixed(1)} ${t('minutes')}`}
          loading={isLoading}
        />
      </DashboardGrid>
    </div>
  );
}
