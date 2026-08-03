'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useNotificationAnalytics } from '@/features/reporting/hooks/use-notification-analytics';
import { ExportButton } from '@/features/reporting/components/export-button';
import type { ReportFilterParams } from '@/features/reporting/api/types';
import { Alert } from '@/shared/ui/alert';
import { DashboardGrid } from '@/shared/ui/layout/page';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';

/**
 * Reminder Success/Failures is not shown -- the BullMQ reminder worker only
 * logs failures via Pino today, nothing is persisted for it, and adding
 * that persistence is worker/infra scope, out of bounds for a read-only
 * reporting module (see the backend port's own comment).
 */
export function NotificationAnalyticsPanel({ filter, refetchIntervalMs }: { filter: ReportFilterParams; refetchIntervalMs: number | false }) {
  const t = useTranslations('admin.analytics.notifications');
  const { data, isLoading, isError } = useNotificationAnalytics(filter, refetchIntervalMs);

  if (isError) return <Alert variant="danger">{t('loadError')}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-xs text-text-tertiary">{t('limitationsNote')}</p>
        </div>
        <ExportButton section="notifications" filter={filter} />
      </div>
      <DashboardGrid columns={3}>
        <LinkableStatCard icon={Bell} label={t('sent')} value={String(data?.sent ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Bell} label={t('read')} value={String(data?.read ?? 0)} loading={isLoading} />
        <LinkableStatCard icon={Bell} label={t('unread')} value={String(data?.unread ?? 0)} loading={isLoading} />
      </DashboardGrid>
    </div>
  );
}
